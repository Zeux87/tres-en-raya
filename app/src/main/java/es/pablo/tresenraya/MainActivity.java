package es.pablo.tresenraya;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private static final String INICIO = "file:///android_asset/index.html";
    private static final String CARPETA_JUEGOS = "file:///android_asset/";

    private WebView web;
    private Actualizador actualizador;
    private Cerca cerca;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        actualizador = new Actualizador(this);
        cerca = new Cerca(this, this::avisarCerca);

        web = new WebView(this);
        web.setBackgroundColor(0); // transparente: se ve el fondo del tema, sin destello blanco
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true); // para guardar marcadores, ajustes y partidas
        ajustes.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest peticion) {
                // Solo se navega entre las pantallas del propio juego
                String url = peticion.getUrl().toString();
                return !url.startsWith(CARPETA_JUEGOS);
            }

            @Override
            public void onPageStarted(WebView vista, String url, Bitmap icono) {
                // Al cambiar de pantalla (p. ej. volver al menú) se corta la partida con el otro móvil
                cerca.parar();
                super.onPageStarted(vista, url, icono);
            }
        });
        web.addJavascriptInterface(new Puente(), "Android");
        setContentView(web);

        if (estado != null && web.restoreState(estado) != null) {
            // pantalla recuperada tras cerrar la app en segundo plano
        } else {
            web.loadUrl(INICIO);
        }

        // Comprobación silenciosa de versión nueva al abrir
        if (estado == null) actualizador.comprobar(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        actualizador.alMostrar();
    }

    @Override
    protected void onPause() {
        actualizador.alOcultar();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        if (web != null) web.saveState(salida);
    }

    @Override
    public void onBackPressed() {
        // Atrás vuelve a la pantalla anterior (p. ej. del juego al menú); en el menú, sale
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onRequestPermissionsResult(int peticion, String[] permisos, int[] resultados) {
        super.onRequestPermissionsResult(peticion, permisos, resultados);
        if (peticion == Cerca.PETICION_PERMISOS) cerca.permisosRespondidos();
    }

    /** Pasa un evento de Nearby al juego: window.__cercaEvento({ tipo: ... }) */
    private void avisarCerca(org.json.JSONObject e) {
        runOnUiThread(() -> {
            if (web != null) {
                web.evaluateJavascript("window.__cercaEvento && window.__cercaEvento(" + e.toString() + ")", null);
            }
        });
    }

    @Override
    protected void onDestroy() {
        cerca.parar();
        if (web != null) {
            web.removeJavascriptInterface("Android");
            web.destroy();
        }
        super.onDestroy();
    }

    static String nombreVersion(Activity act) {
        try {
            PackageInfo info = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
            return info.versionName;
        } catch (Exception e) {
            return "?";
        }
    }

    static long codigoVersion(Activity act) {
        try {
            PackageInfo info = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= 28) return info.getLongVersionCode();
            return info.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Funciones que los juegos (JavaScript) pueden llamar como Android.xxx() */
    private class Puente {

        @JavascriptInterface
        public String version() {
            return nombreVersion(MainActivity.this);
        }

        @JavascriptInterface
        public void vibrar(int ms) {
            try {
                Vibrator v = getSystemService(Vibrator.class);
                if (v != null && v.hasVibrator()) {
                    v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception ignorada) {
                // sin vibración, no pasa nada
            }
        }

        @JavascriptInterface
        public void buscarActualizacion() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    actualizador.comprobar(true);
                }
            });
        }

        // ---------- Partidas con otro móvil cercano (ver Cerca.java) ----------

        @JavascriptInterface
        public boolean cercaDisponible() {
            return cerca.disponible();
        }

        @JavascriptInterface
        public void cercaAnunciar(String servicio, String nombre) {
            runOnUiThread(() -> cerca.anunciar(servicio, nombre));
        }

        @JavascriptInterface
        public void cercaBuscar(String servicio, String nombre) {
            runOnUiThread(() -> cerca.buscar(servicio, nombre));
        }

        @JavascriptInterface
        public void cercaConectar(String id) {
            runOnUiThread(() -> cerca.conectar(id));
        }

        @JavascriptInterface
        public void cercaEnviar(String texto) {
            runOnUiThread(() -> cerca.enviar(texto));
        }

        @JavascriptInterface
        public void cercaParar() {
            runOnUiThread(() -> cerca.parar());
        }

        @JavascriptInterface
        public void cercaAjustes() {
            runOnUiThread(() -> cerca.abrirAjustes());
        }

        @JavascriptInterface
        public void cercaAjustesDe(String que) {
            runOnUiThread(() -> cerca.abrirAjustesDe(que));
        }
    }
}
