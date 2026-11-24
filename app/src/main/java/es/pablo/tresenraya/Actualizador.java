package es.pablo.tresenraya;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.ProgressBar;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.lang.ref.WeakReference;
import java.nio.charset.StandardCharsets;

/**
 * Busca la última versión publicada en GitHub Releases (Zeux87/tres-en-raya),
 * y si es más nueva que la instalada la descarga e instala.
 */
final class Actualizador {

    private static final String API =
            "https://api.github.com/repos/Zeux87/tres-en-raya/releases/latest";

    /** Página de la última versión, para instalarla a mano si la automática falla. */
    static final String WEB =
            "https://github.com/Zeux87/tres-en-raya/releases/latest";

    /** El actualizador de la pantalla que está a la vista (para ReceptorInstalacion). */
    private static WeakReference<Actualizador> visible = new WeakReference<>(null);
    /** Resultado de la instalación que llegó con la app en segundo plano. */
    private static Intent resultadoPendiente;

    private static final String BLOQUEADORES =
            "\n\nEn Samsung, desactiva un momento «Bloqueador automático» "
            + "(Ajustes > Seguridad y privacidad). En otros móviles, revisa Play Protect.";

    private final Activity act;
    private boolean ocupado;
    /** APK que espera a que el usuario dé permiso para instalar apps. */
    private String urlEsperandoPermiso;

    Actualizador(Activity act) {
        this.act = act;
    }

    void comprobar(final boolean manual) {
        if (ocupado) return;
        ocupado = true;
        if (manual) aviso("Buscando actualizaciones…");

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject rel = new JSONObject(leerTexto(API));
                    final long remota = numero(rel.optString("tag_name", ""));
                    final long local = MainActivity.codigoVersion(act);
                    final String titulo = rel.optString("name", "Versión " + remota);
                    final String notas = rel.optString("body", "").trim();

                    String apk = null;
                    JSONArray adjuntos = rel.optJSONArray("assets");
                    if (adjuntos != null) {
                        for (int i = 0; i < adjuntos.length(); i++) {
                            JSONObject a = adjuntos.getJSONObject(i);
                            if (a.optString("name", "").endsWith(".apk")) {
                                apk = a.optString("browser_download_url", null);
                                break;
                            }
                        }
                    }
                    final String urlApk = apk;

                    act.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            ocupado = false;
                            if (act.isFinishing() || act.isDestroyed()) return;
                            if (remota > local && urlApk != null) {
                                preguntar(titulo, notas, urlApk);
                            } else if (manual) {
                                aviso("Ya tienes la última versión");
                            }
                        }
                    });
                } catch (final Exception e) {
                    act.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            ocupado = false;
                            if (manual) aviso("No se pudo comprobar: " + e.getMessage());
                        }
                    });
                }
            }
        }).start();
    }

    private void preguntar(String titulo, String notas, final String urlApk) {
        String mensaje = titulo + (notas.isEmpty() ? "" : "\n\n" + notas) + "\n\n¿Quieres instalarla ahora?";
        new AlertDialog.Builder(act)
                .setTitle("Nueva versión disponible")
                .setMessage(mensaje)
                .setPositiveButton("Actualizar", (d, w) -> actualizar(urlApk))
                .setNegativeButton("Más tarde", null)
                .setNeutralButton("Desde la web", (d, w) -> abrirWeb())
                .show();
    }

    // ---------- Ciclo de vida (lo llama MainActivity) ----------

    void alMostrar() {
        visible = new WeakReference<>(this);
        if (resultadoPendiente != null) {
            Intent r = resultadoPendiente;
            resultadoPendiente = null;
            resultado(r);
        }
        if (urlEsperandoPermiso != null && puedeInstalar()) {
            String url = urlEsperandoPermiso;
            urlEsperandoPermiso = null;
            descargar(url);
        }
    }

    void alOcultar() {
        if (visible.get() == this) visible.clear();
    }

    /** Llega desde ReceptorInstalacion con el resultado de Android. */
    static void resultadoRecibido(android.content.Context contexto, Intent intent) {
        Actualizador a = visible.get();
        if (a != null && !a.act.isFinishing()) {
            a.resultado(intent);
            return;
        }
        // La app no está a la vista: se enseña al volver a ella
        resultadoPendiente = intent;
        if (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -99) == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmar = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirmar != null) {
                try {
                    confirmar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    contexto.startActivity(confirmar);
                    resultadoPendiente = null;
                } catch (Exception ignorada) {
                    // Android no deja abrirla desde segundo plano: se hará al volver
                }
            }
        }
    }

    private void resultado(Intent intent) {
        int estado = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (estado == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            // Android pide confirmación: abrimos su pantalla de "¿Instalar?" desde la app visible
            Intent confirmar = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirmar == null) {
                fallo("Android no mostró la pantalla de instalación.");
                return;
            }
            try {
                act.startActivity(confirmar);
            } catch (Exception e) {
                fallo("No se pudo abrir la pantalla de instalación (" + e.getMessage() + ").");
            }
            return;
        }
        if (estado == PackageInstaller.STATUS_SUCCESS) return; // la app se reinicia sola
        if (estado == PackageInstaller.STATUS_FAILURE_ABORTED) {
            fallo("La instalación se canceló o la bloqueó el móvil." + BLOQUEADORES);
            return;
        }
        String mensaje = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        String texto;
        if (estado == PackageInstaller.STATUS_FAILURE_CONFLICT
                || estado == PackageInstaller.STATUS_FAILURE_INCOMPATIBLE
                || (mensaje != null && mensaje.contains("UPDATE_INCOMPATIBLE"))) {
            texto = "La versión nueva está firmada con otra clave que la que tienes instalada, "
                    + "así que Android no deja instalarla encima.\n\n"
                    + "Desinstala la app y vuelve a instalarla desde la web "
                    + "(se pierden los marcadores guardados).";
        } else if (estado == PackageInstaller.STATUS_FAILURE_STORAGE) {
            texto = "No hay espacio suficiente en el móvil.";
        } else if (estado == PackageInstaller.STATUS_FAILURE_BLOCKED) {
            texto = "Android ha bloqueado la instalación." + BLOQUEADORES;
        } else {
            texto = "Android no pudo instalarla." + BLOQUEADORES;
        }
        if (mensaje != null && !mensaje.isEmpty()) texto += "\n\nDetalle: " + mensaje;
        fallo(texto);
    }

    /** Explica el fallo y ofrece instalar a mano desde la web. */
    private void fallo(String texto) {
        if (act.isFinishing() || act.isDestroyed()) return;
        new AlertDialog.Builder(act)
                .setTitle("No se pudo actualizar")
                .setMessage(texto + "\n\nPuedes descargarla desde la web e instalarla a mano.")
                .setPositiveButton("Abrir la web", (d, w) -> abrirWeb())
                .setNegativeButton("Cerrar", null)
                .show();
    }

    private void abrirWeb() {
        try {
            act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(WEB)));
        } catch (Exception e) {
            aviso("Abre en el navegador: " + WEB);
        }
    }

    // ---------- Permiso de "instalar apps desconocidas" ----------

    private boolean puedeInstalar() {
        return Build.VERSION.SDK_INT < 26 || act.getPackageManager().canRequestPackageInstalls();
    }

    private void actualizar(final String urlApk) {
        if (puedeInstalar()) {
            descargar(urlApk);
            return;
        }
        new AlertDialog.Builder(act)
                .setTitle("Falta un permiso")
                .setMessage("Para actualizarse, Android tiene que dejar que Juegos instale apps.\n\n"
                        + "En la pantalla que se abre, activa «Permitir de esta fuente» y vuelve atrás.")
                .setPositiveButton("Abrir ajustes", (d, w) -> {
                    urlEsperandoPermiso = urlApk;
                    try {
                        act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + act.getPackageName())));
                    } catch (Exception e) {
                        urlEsperandoPermiso = null;
                        fallo("No se pudieron abrir los ajustes.");
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    // ---------- Descarga e instalación ----------

    private void descargar(final String urlApk) {
        final ProgressBar barra = new ProgressBar(act, null, android.R.attr.progressBarStyleHorizontal);
        barra.setMax(100);
        barra.setIndeterminate(true);
        int margen = (int) (24 * act.getResources().getDisplayMetrics().density);
        barra.setPadding(margen, margen / 2, margen, 0);

        final AlertDialog dialogo = new AlertDialog.Builder(act)
                .setTitle("Descargando actualización…")
                .setView(barra)
                .setCancelable(false)
                .show();

        new Thread(new Runnable() {
            @Override
            public void run() {
                HttpURLConnection con = null;
                try {
                    con = abrir(urlApk);
                    final long total = con.getContentLengthLong();
                    if (total > 0) {
                        act.runOnUiThread(() -> barra.setIndeterminate(false));
                    }

                    PackageInstaller instalador = act.getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params =
                            new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(act.getPackageName());
                    int idSesion = instalador.createSession(params);

                    try (PackageInstaller.Session sesion = instalador.openSession(idSesion);
                         InputStream entrada = con.getInputStream()) {

                        try (OutputStream salida = sesion.openWrite("tresenraya.apk", 0, total > 0 ? total : -1)) {
                            byte[] buf = new byte[64 * 1024];
                            long leidos = 0;
                            int ultimoPct = -1;
                            int n;
                            while ((n = entrada.read(buf)) > 0) {
                                salida.write(buf, 0, n);
                                leidos += n;
                                if (total > 0) {
                                    final int pct = (int) (leidos * 100 / total);
                                    if (pct != ultimoPct) {
                                        ultimoPct = pct;
                                        act.runOnUiThread(() -> barra.setProgress(pct));
                                    }
                                }
                            }
                            sesion.fsync(salida);
                        }

                        Intent aviso = new Intent(act, ReceptorInstalacion.class);
                        int banderas = PendingIntent.FLAG_UPDATE_CURRENT;
                        if (Build.VERSION.SDK_INT >= 31) banderas |= PendingIntent.FLAG_MUTABLE;
                        PendingIntent pi = PendingIntent.getBroadcast(act, idSesion, aviso, banderas);
                        sesion.commit(pi.getIntentSender());
                    }

                    act.runOnUiThread(() -> cerrar(dialogo));
                } catch (final Exception e) {
                    act.runOnUiThread(() -> {
                        cerrar(dialogo);
                        fallo("Error al descargar: " + e.getMessage());
                    });
                } finally {
                    if (con != null) con.disconnect();
                }
            }
        }).start();
    }

    private void cerrar(AlertDialog d) {
        try {
            if (d.isShowing()) d.dismiss();
        } catch (Exception ignorada) {
            // la actividad ya no existe
        }
    }

    private void aviso(String texto) {
        Toast.makeText(act, texto, Toast.LENGTH_SHORT).show();
    }

    // ---------- Red ----------

    private static HttpURLConnection abrir(String url) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(15000);
        con.setReadTimeout(30000);
        con.setInstanceFollowRedirects(true);
        con.setRequestProperty("User-Agent", "TresEnRaya-Android");
        con.setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream");
        int codigo = con.getResponseCode();
        if (codigo == 404) {
            con.disconnect();
            throw new IOException("todavía no hay versiones publicadas");
        }
        if (codigo != HttpURLConnection.HTTP_OK) {
            con.disconnect();
            throw new IOException("HTTP " + codigo);
        }
        return con;
    }

    private static String leerTexto(String url) throws IOException {
        HttpURLConnection con = abrir(url);
        try (InputStream in = con.getInputStream()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } finally {
            con.disconnect();
        }
    }

    /** "v12" -> 12 */
    private static long numero(String etiqueta) {
        String digitos = etiqueta.replaceAll("[^0-9]", "");
        if (digitos.isEmpty()) return 0;
        try {
            return Long.parseLong(digitos);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
