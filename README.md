# Juegos

App Android con tres juegos:

**3 en raya**
- Contra el móvil con tres niveles: Fácil, Normal e Imposible (juego perfecto: nunca pierde).
- 2 jugadores en el mismo móvil.
- Marcador guardado por modo y dificultad; quien empieza se alterna en cada partida.

**Conecta 4**
- Tablero de 7 columnas × 6 filas; tocas una columna y la ficha cae.
- Contra el móvil (tú rojas, el móvil amarillas) con tres niveles: Fácil, Normal y Difícil
  (minimax con poda alfa-beta que profundiza mientras tiene tiempo, hasta ~1 s por jugada).
- 2 jugadores en el mismo móvil. Marcador guardado y salida alterna, como en el 3 en raya.

**Hundir la flota** (2 jugadores en el mismo móvil)
- Tablero de 10×10 y 5 barcos: portaaviones (5), acorazado (4), crucero (3), submarino (3) y destructor (2).
- Los barcos no pueden tocarse, ni en diagonal. Se colocan a mano (tocar para poner, tocar el barco para girarlo) o al azar.
- Si aciertas, vuelves a disparar; si es agua, pasas el móvil. Al hundir un barco se marca el agua de alrededor.
- Pantalla tapada para pasar el móvil sin ver la flota del otro, partida guardada si se cierra la app, estadísticas y victorias por jugador.

Además: tema claro/oscuro automático, vibración y **actualización automática** desde Releases.

## Instalar

Descarga `tres-en-raya.apk` de la [última versión](https://github.com/Zeux87/tres-en-raya/releases/latest) y ábrelo en el móvil
(la primera vez Android pedirá permitir la instalación desde el navegador o el gestor de archivos).

## Cómo se publica una versión

Cada `push` a `main` lanza GitHub Actions (`.github/workflows/compilar.yml`), que:

1. Pasa las pruebas de la lógica (`herramientas/pruebas.js`, `pruebas-conecta4.js` y `pruebas-flota.js`).
2. Compila el APK firmado con la clave guardada en los secrets del repositorio, usando el número de compilación como `versionCode`.
3. Lo publica en Releases como `v<número>`; la app detecta esa versión y se actualiza.

### Clave de firma

La clave **no está en el repositorio**. GitHub Actions la lee de estos secrets
(*Settings → Secrets and variables → Actions*):

| Secret | Qué es |
|---|---|
| `FIRMA_ALMACEN_BASE64` | El archivo `.jks` en base64 (`base64 -w0 firma.jks`, o `base64 -i firma.jks` en macOS) |
| `FIRMA_CLAVE_ALMACEN` | Contraseña del almacén |
| `FIRMA_ALIAS` | Alias de la clave |
| `FIRMA_CLAVE` | Contraseña de la clave |

Si falta el almacén, la compilación falla en vez de publicar un APK sin firmar.
Para firmar en local, pon `FIRMA_ALMACEN` (ruta al `.jks`), `FIRMA_CLAVE_ALMACEN`,
`FIRMA_ALIAS` y `FIRMA_CLAVE` en `~/.gradle/gradle.properties` o como variables de entorno;
sin ellas el APK de depuración usa la firma de depuración de Android.
Guarda una copia del `.jks` fuera del repo: si se pierde, las nuevas versiones no se
podrán instalar encima de las anteriores.

## Estructura

| Ruta | Qué hay |
|---|---|
| `app/src/main/assets/index.html` | Menú de inicio, versión y botón de actualizar |
| `app/src/main/assets/comun.css` | Estilos compartidos (colores, botones, modo oscuro) |
| `app/src/main/assets/tresenraya.html`, `interfaz.js`, `juego.js` | 3 en raya: pantalla, interfaz y lógica (minimax con poda alfa-beta) |
| `app/src/main/assets/conecta4.html`, `conecta4-interfaz.js`, `conecta4.js` | Conecta 4: pantalla, interfaz y lógica con la IA |
| `app/src/main/assets/flota.html`, `flota-interfaz.js`, `flota.js` | Hundir la flota: pantalla, interfaz y lógica |
| `app/src/main/java/es/pablo/tresenraya/` | Actividad Android (WebView), vibración y autoactualización |
| `herramientas/` | Pruebas de la lógica de los tres juegos |
