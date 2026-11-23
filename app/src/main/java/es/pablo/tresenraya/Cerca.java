package es.pablo.tresenraya;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Partidas entre dos móviles que están cerca, con Google Nearby Connections
 * (Bluetooth y wifi directo, sin internet).
 *
 * Un móvil "anuncia" la partida y el otro la "busca" y se une. Una vez
 * conectados, los juegos se mandan mensajes de texto (JSON). Todo lo que pasa
 * se avisa al JavaScript con eventos: esperando, encontrado, perdido,
 * conectando, conectado, desconectado, mensaje, permisos y error.
 */
class Cerca {

    interface Oyente {
        void evento(JSONObject e);
    }

    static final int PETICION_PERMISOS = 4107;

    private static final Strategy ESTRATEGIA = Strategy.P2P_POINT_TO_POINT;

    private final Activity act;
    private final Oyente oyente;
    private ConnectionsClient cliente;

    private String servicio;       // uno por juego, para no encontrar partidas de otro juego
    private String nombre;         // nombre de este jugador, lo ve el otro móvil
    private String pendiente;      // "anunciar" o "buscar" mientras se piden permisos
    private String conectado;      // id del otro móvil cuando hay conexión
    private String conectando;     // id del otro móvil mientras se conecta
    private String nombreRival = "";

    Cerca(Activity act, Oyente oyente) {
        this.act = act;
        this.oyente = oyente;
    }

    private ConnectionsClient cliente() {
        if (cliente == null) cliente = Nearby.getConnectionsClient(act);
        return cliente;
    }

    /** ¿Tiene el móvil los servicios de Google que hacen falta? */
    boolean disponible() {
        try {
            return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(act) == ConnectionResult.SUCCESS;
        } catch (Exception e) {
            return false;
        }
    }

    // ---------- Permisos ----------

    /** Los permisos que pide Nearby cambian con la versión de Android */
    private static String[] permisosNecesarios() {
        List<String> p = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 31) {
            p.add(Manifest.permission.BLUETOOTH_SCAN);
            p.add(Manifest.permission.BLUETOOTH_ADVERTISE);
            p.add(Manifest.permission.BLUETOOTH_CONNECT);
        }
        if (Build.VERSION.SDK_INT >= 33) {
            p.add(Manifest.permission.NEARBY_WIFI_DEVICES);
        } else {
            // Hasta Android 12 buscar dispositivos cercanos cuenta como ubicación
            p.add(Manifest.permission.ACCESS_FINE_LOCATION);
            p.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        return p.toArray(new String[0]);
    }

    private String[] permisosQueFaltan() {
        List<String> faltan = new ArrayList<>();
        for (String p : permisosNecesarios()) {
            if (act.checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) faltan.add(p);
        }
        return faltan.toArray(new String[0]);
    }

    /** Lo llama MainActivity cuando el usuario responde al diálogo de permisos */
    void permisosRespondidos() {
        String accion = pendiente;
        pendiente = null;
        if (accion == null) return;
        if (permisosQueFaltan().length > 0) {
            // Si ya no se pueden pedir ("no volver a preguntar"), habrá que ir a Ajustes
            boolean ajustes = false;
            for (String p : permisosQueFaltan()) {
                if (!act.shouldShowRequestPermissionRationale(p)) ajustes = true;
            }
            avisar(evento("permisos").put2("ajustes", ajustes));
            return;
        }
        empezar(accion);
    }

    /** Abre los ajustes de la app para dar los permisos a mano */
    void abrirAjustes() {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", act.getPackageName(), null));
            act.startActivity(i);
        } catch (Exception ignorada) {
            // nada
        }
    }

    // ---------- Crear y buscar partidas ----------

    void anunciar(String servicio, String nombre) {
        preparar(servicio, nombre, "anunciar");
    }

    void buscar(String servicio, String nombre) {
        preparar(servicio, nombre, "buscar");
    }

    private void preparar(String servicio, String nombre, String accion) {
        parar();
        this.servicio = servicio;
        this.nombre = nombre == null || nombre.trim().isEmpty() ? "Jugador" : nombre.trim();
        if (!disponible()) {
            avisar(evento("error").put2("texto", "Este móvil no tiene los servicios de Google Play que hacen falta para jugar con otro móvil."));
            return;
        }
        String[] faltan = permisosQueFaltan();
        if (faltan.length > 0) {
            pendiente = accion;
            act.requestPermissions(faltan, PETICION_PERMISOS);
            return;
        }
        empezar(accion);
    }

    private void empezar(String accion) {
        if ("anunciar".equals(accion)) {
            AdvertisingOptions op = new AdvertisingOptions.Builder().setStrategy(ESTRATEGIA).build();
            cliente().startAdvertising(nombre, servicio, conexion, op)
                    .addOnSuccessListener(v -> avisar(evento("esperando")))
                    .addOnFailureListener(e -> fallo(e, "No se pudo crear la partida"));
        } else {
            DiscoveryOptions op = new DiscoveryOptions.Builder().setStrategy(ESTRATEGIA).build();
            cliente().startDiscovery(servicio, descubrimiento, op)
                    .addOnSuccessListener(v -> avisar(evento("buscando")))
                    .addOnFailureListener(e -> fallo(e, "No se pudo buscar partidas"));
        }
    }

    /** Unirse a la partida que anuncia el móvil "id" */
    void conectar(String id) {
        if (conectado != null || conectando != null) return;
        conectando = id;
        avisar(evento("conectando").put2("id", id));
        cliente().requestConnection(nombre, id, conexion)
                .addOnFailureListener(e -> {
                    conectando = null;
                    fallo(e, "No se pudo conectar con ese móvil");
                });
    }

    void enviar(String texto) {
        if (conectado == null || texto == null) return;
        cliente().sendPayload(conectado, Payload.fromBytes(texto.getBytes(StandardCharsets.UTF_8)));
    }

    /** Lo deja todo: deja de anunciar y de buscar y corta la conexión */
    void parar() {
        pendiente = null;
        conectado = null;
        conectando = null;
        if (cliente == null) return;
        try {
            cliente.stopAdvertising();
            cliente.stopDiscovery();
            cliente.stopAllEndpoints();
        } catch (Exception ignorada) {
            // nada
        }
    }

    // ---------- Respuestas de Nearby ----------

    private final EndpointDiscoveryCallback descubrimiento = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(String id, DiscoveredEndpointInfo info) {
            if (servicio == null || !servicio.equals(info.getServiceId())) return;
            avisar(evento("encontrado").put2("id", id).put2("nombre", info.getEndpointName()));
        }

        @Override
        public void onEndpointLost(String id) {
            avisar(evento("perdido").put2("id", id));
        }
    };

    private final ConnectionLifecycleCallback conexion = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(String id, ConnectionInfo info) {
            if (conectado != null) {
                // Ya hay partida: no se admite un tercero
                cliente().rejectConnection(id);
                return;
            }
            conectando = id;
            nombreRival = info.getEndpointName();
            cliente().acceptConnection(id, datos);
        }

        @Override
        public void onConnectionResult(String id, ConnectionResolution resultado) {
            if (!id.equals(conectando)) return;
            conectando = null;
            if (resultado.getStatus().isSuccess()) {
                conectado = id;
                try {
                    cliente().stopAdvertising();
                    cliente().stopDiscovery();
                } catch (Exception ignorada) {
                    // nada
                }
                avisar(evento("conectado").put2("nombre", nombreRival));
            } else {
                avisar(evento("error").put2("texto", "El otro móvil no ha aceptado la conexión. Probad otra vez."));
            }
        }

        @Override
        public void onDisconnected(String id) {
            if (!id.equals(conectado)) return;
            conectado = null;
            avisar(evento("desconectado"));
        }
    };

    private final PayloadCallback datos = new PayloadCallback() {
        @Override
        public void onPayloadReceived(String id, Payload payload) {
            if (payload.getType() != Payload.Type.BYTES || payload.asBytes() == null) return;
            avisar(evento("mensaje").put2("texto", new String(payload.asBytes(), StandardCharsets.UTF_8)));
        }

        @Override
        public void onPayloadTransferUpdate(String id, PayloadTransferUpdate actualizacion) {
            // los mensajes son pequeños: llegan de una vez
        }
    };

    // ---------- Avisos al JavaScript ----------

    private void fallo(Exception e, String texto) {
        int codigo = e instanceof ApiException ? ((ApiException) e).getStatusCode() : -1;
        if (codigo == ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING
                || codigo == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING) {
            return; // ya estaba en marcha: no es un error
        }
        String detalle;
        if (codigo == ConnectionsStatusCodes.MISSING_PERMISSION_ACCESS_COARSE_LOCATION) {
            detalle = "Falta el permiso de ubicación.";
        } else if (codigo == ConnectionsStatusCodes.STATUS_RADIO_ERROR) {
            detalle = "Revisa que el Bluetooth y el wifi estén encendidos.";
        } else if (codigo == ConnectionsStatusCodes.STATUS_ENDPOINT_UNKNOWN) {
            detalle = "Ese móvil ya no está disponible.";
        } else {
            detalle = "Revisa que el Bluetooth, el wifi y la ubicación estén encendidos (código " + codigo + ").";
        }
        avisar(evento("error").put2("texto", texto + ". " + detalle));
    }

    private void avisar(Evento e) {
        oyente.evento(e);
    }

    private static Evento evento(String tipo) {
        return new Evento().put2("tipo", tipo);
    }

    /** JSONObject con un put que no lanza excepciones, para encadenar */
    static class Evento extends JSONObject {
        Evento put2(String clave, Object valor) {
            try {
                put(clave, valor);
            } catch (Exception ignorada) {
                // claves fijas: no pasa
            }
            return this;
        }
    }
}
