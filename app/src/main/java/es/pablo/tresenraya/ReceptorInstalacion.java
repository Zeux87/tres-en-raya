package es.pablo.tresenraya;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.widget.Toast;

/** Recibe el resultado de la instalación de una actualización. */
public class ReceptorInstalacion extends BroadcastReceiver {

    @Override
    public void onReceive(Context contexto, Intent intent) {
        int estado = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);

        if (estado == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            // Android pide confirmación al usuario: abrimos su pantalla de "¿Instalar?"
            Intent confirmar = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirmar != null) {
                confirmar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                contexto.startActivity(confirmar);
            }
            return;
        }

        if (estado == PackageInstaller.STATUS_SUCCESS || estado == PackageInstaller.STATUS_FAILURE_ABORTED) {
            return; // instalada, o el usuario ha cancelado
        }

        String mensaje = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
        Toast.makeText(contexto,
                "No se pudo actualizar" + (mensaje != null ? ": " + mensaje : ""),
                Toast.LENGTH_LONG).show();
    }
}
