package es.pablo.tresenraya;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {

    private WebView web;
    private Actualizador actualizador;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        actualizador = new Actualizador(this);

        web = new WebView(this);
        web.setBackgroundColor(0); // transparente: se ve el fondo del tema, sin destello blanco
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true); // para guardar marcador y ajustes
        ajustes.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest peticion) {
                return true; // el juego no navega a ningún sitio
            }
        });
        web.addJavascriptInterface(new Puente(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");

        // Comprobación silenciosa de versión nueva al abrir
        actualizador.comprobar(false);
    }

    @Override
    protected void onDestroy() {
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

    /** Funciones que el juego (JavaScript) puede llamar como Android.xxx() */
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
    }
}
