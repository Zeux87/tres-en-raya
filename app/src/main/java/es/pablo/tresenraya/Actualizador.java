package es.pablo.tresenraya;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
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
import java.nio.charset.StandardCharsets;

/**
 * Busca la última versión publicada en GitHub Releases (Zeux87/tres-en-raya),
 * y si es más nueva que la instalada la descarga e instala.
 */
final class Actualizador {

    private static final String API =
            "https://api.github.com/repos/Zeux87/tres-en-raya/releases/latest";

    private final Activity act;
    private boolean ocupado;

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
                .setPositiveButton("Actualizar", (d, w) -> descargar(urlApk))
                .setNegativeButton("Más tarde", null)
                .show();
    }

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
                        aviso("Error al descargar: " + e.getMessage());
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
