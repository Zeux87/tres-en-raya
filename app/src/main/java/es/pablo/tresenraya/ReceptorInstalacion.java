package es.pablo.tresenraya;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Recibe el resultado de la instalación de una actualización y se lo pasa al
 * Actualizador de la pantalla visible. Abrir la pantalla "¿Instalar?" desde aquí
 * (segundo plano) lo bloquean algunos móviles sin avisar, así que se hace desde
 * la actividad.
 */
public class ReceptorInstalacion extends BroadcastReceiver {

    @Override
    public void onReceive(Context contexto, Intent intent) {
        Actualizador.resultadoRecibido(contexto, intent);
    }
}
