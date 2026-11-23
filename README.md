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
- Pantalla tapada para pasar el móvil sin ver la flota del otro, estadísticas y victorias por jugador.

Todos los juegos guardan la partida a medias si se cierra la app (el menú avisa con "partida a medias")
y comparten marcador, botón "‹ Menú" y estilos a través de una plantilla común.

Además: tema claro/oscuro automático, vibración y **actualización automática** desde Releases.

## Instalar

Descarga `tres-en-raya.apk` de la [última versión](https://github.com/Zeux87/tres-en-raya/releases/latest) y ábrelo en el móvil
(la primera vez Android pedirá permitir la instalación desde el navegador o el gestor de archivos).

## Cómo se publica una versión

Cada `push` a `main` lanza GitHub Actions (`.github/workflows/compilar.yml`), que:

1. Pasa todas las pruebas (`node herramientas/todas.js`, que ejecuta cada `herramientas/pruebas*.js`).
2. Compila el APK firmado con `app/tresenraya.jks`, usando el número de compilación como `versionCode`.
3. Lo publica en Releases como `v<número>`; la app detecta esa versión y se actualiza.

## Estructura

| Ruta | Qué hay |
|---|---|
| `app/src/main/assets/index.html` | Menú de inicio (se genera desde `juegos.js`), versión y botón de actualizar |
| `app/src/main/assets/juegos.js` | Lista de juegos: id, página, título, texto e icono de cada tarjeta del menú |
| `app/src/main/assets/plataforma.js` | Plantilla común: almacenamiento, partida guardada, marcador, "‹ Menú", vibración |
| `app/src/main/assets/comun.css` | Estilos compartidos (colores, botones, marcador, modo oscuro) |
| `app/src/main/assets/tresenraya.html`, `interfaz.js`, `juego.js` | 3 en raya: pantalla, interfaz y lógica (minimax con poda alfa-beta) |
| `app/src/main/assets/conecta4.html`, `conecta4-interfaz.js`, `conecta4.js` | Conecta 4: pantalla, interfaz y lógica con la IA |
| `app/src/main/assets/flota.html`, `flota-interfaz.js`, `flota.js` | Hundir la flota: pantalla, interfaz y lógica |
| `app/src/main/java/es/pablo/tresenraya/` | Actividad Android (WebView), vibración y autoactualización |
| `herramientas/` | Pruebas (`todas.js` las lanza todas) y `plantilla/` para empezar un juego nuevo |

## Añadir un juego

1. Copia los archivos de `herramientas/plantilla/` como explica su [LEEME](herramientas/plantilla/LEEME.md).
2. Añade una entrada en `app/src/main/assets/juegos.js`: el menú se genera solo.
3. `node herramientas/todas.js`: el workflow no hay que tocarlo.
