# Juegos

App Android con diecisiete juegos:

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

**Piedra, papel o tijera**
- Contra el móvil: «Al azar» o «Listo», que se fija en lo que sueles sacar tras tus últimas jugadas e intenta adelantarse.
- Marcador y mejor racha guardados por nivel.

**Buscaminas**
- Tres tamaños: Fácil (8×10, 10 minas), Normal (10×14, 24) y Difícil (12×16, 40). El primer toque nunca es mina.
- Banderas con el botón 🚩 o manteniendo pulsado; tocar un número con sus banderas puestas abre lo de alrededor.
- Récord de tiempo por nivel y partida guardada si sales.

**Snake**
- Tres velocidades, que aumentan un poco según comes. Se gira deslizando el dedo o con las flechas.
- Récord por velocidad; se pone en pausa y se guarda si sales de la app.

**2048**
- Desliza para mover; dos fichas iguales se juntan. Récord, deshacer el último movimiento y partida guardada.

**Memoria** (parejas)
- Tres niveles: Fácil (12 cartas), Normal (16) y Difícil (20).
- Solo: cronómetro e intentos, con récord guardado por nivel (menos intentos; a igualdad, menos tiempo).
- 2 jugadores: si encuentras pareja repites turno; gana quien tenga más parejas. Victorias guardadas.

**Ahorcado** (palabras en español)
- Solo: el móvil elige entre 137 palabras de Animales, Comida, Lugares y Cosas (o todas mezcladas), sin repetir las últimas.
- 2 jugadores: uno escribe la palabra a escondidas (con pista opcional) y el otro la adivina; los papeles se alternan.
- Teclado con Ñ; las vocales con tilde o diéresis se descubren con la vocal normal. 6 fallos y estás ahorcado.

**Damas** (reglas españolas)
- Comer es obligatorio y hay que elegir la jugada que más piezas come; los peones comen solo hacia delante.
- Las damas son voladoras. Tablas tras 50 jugadas seguidas sin comer ni mover peones.
- Contra el móvil (tú blancas) con tres niveles, o a dos en un móvil. Se toca la pieza y luego su destino.

**Reversi**
- Pon una ficha que encierre fichas del otro y se voltean. Si no puedes mover, pasas.
- Contra el móvil (tú negras) con tres niveles: Fácil, Normal (valora las casillas) y Difícil (piensa 4 jugadas).

**Puntos y cajas**
- Rejilla de 5×5 cajas. Quien cierra una caja se la queda y vuelve a jugar.
- Contra el móvil con tres niveles (el difícil no regala cajas y, si tiene que hacerlo, regala la cadena más corta), o a dos.

**Sudoku**
- Tres niveles (40, 32 o 26 pistas), siempre con solución única.
- Notas, borrar, deshacer y pistas (cada una suma 30 segundos). Los errores se marcan en rojo.
- Récord de tiempo por nivel y partida guardada.

**Simón dice**
- Repite la secuencia de colores, que crece en uno cada ronda y se acelera poco a poco. Con o sin sonido.
- Tres velocidades, con récord de rondas por velocidad.

**Bloques** (piezas que caen)
- Tablero de 10×20, las 7 piezas de siempre, sombra de dónde caerá y la siguiente pieza a la vista.
- Toca para girar, arrastra para mover y desliza hacia abajo para soltar, o usa los botones.
- Empieza en el nivel 1, 5 o 9; cada 10 líneas sube de nivel. Récord y partida guardada en pausa.

**Rompeladrillos**
- Arrastra el dedo para mover la pala y toca para lanzar la bola. 3 vidas y 5 dibujos de ladrillos que se repiten
  cada vez más rápido; los grises aguantan dos golpes. Récord y partida guardada en pausa.

**Solitario** (Klondike)
- Robando de 1 en 1 o de 3 en 3. Toca una carta para mandarla a su mejor sitio o arrástrala a donde quieras.
- Deshacer, pista, cronómetro, y se termina solo cuando está todo destapado. Partidas ganadas por modo.

**Jugar con dos móviles** (3 en raya, Conecta 4, Hundir la flota, Piedra, papel o tijera, Memoria, Ahorcado, Damas, Reversi y Puntos y cajas)
- Con dos móviles cerca, sin internet: se conectan por Bluetooth y wifi con Google Nearby Connections.
- Uno toca «Crear partida» y el otro «Unirme a una partida»; cada uno juega en su pantalla
  (en Hundir la flota cada uno coloca su flota en su móvil, sin pasarse el móvil).
- La primera vez Android pide el permiso de «Dispositivos cercanos» (o ubicación en Android 11 y anteriores).
- Si se corta la conexión, se avisa y se vuelve al modo de un móvil. El marcador de estas partidas no se guarda.
- Código: `Cerca.java` (Nearby, permisos) y `assets/cerca.js` (ventana para conectar y mensajes entre los juegos).

Todos los juegos comparten una plantilla común (marcador, partida guardada, botón "‹ Menú" y estilos).
Los que se juegan por partidas las guardan si se cierra la app, y el menú avisa con "partida a medias".

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
| `app/src/main/assets/ppt.html`, `ppt-interfaz.js`, `ppt.js` | Piedra, papel o tijera |
| `app/src/main/assets/buscaminas.html`, `buscaminas-interfaz.js`, `buscaminas.js` | Buscaminas |
| `app/src/main/assets/snake.html`, `snake-interfaz.js`, `snake.js` | Snake |
| `app/src/main/assets/2048.html`, `2048-interfaz.js`, `2048.js` | 2048 |
| `app/src/main/assets/memoria.html`, `memoria-interfaz.js`, `memoria.js` | Memoria: pantalla, interfaz y lógica de las parejas |
| `app/src/main/assets/ahorcado.html`, `ahorcado-interfaz.js`, `ahorcado.js` | Ahorcado: pantalla, interfaz, lógica y lista de palabras |
| `app/src/main/assets/damas.html`, `damas-interfaz.js`, `damas.js` | Damas: reglas españolas y minimax con poda alfa-beta |
| `app/src/main/assets/reversi.html`, `reversi-interfaz.js`, `reversi.js` | Reversi |
| `app/src/main/assets/cajas.html`, `cajas-interfaz.js`, `cajas.js` | Puntos y cajas |
| `app/src/main/assets/sudoku.html`, `sudoku-interfaz.js`, `sudoku.js` | Sudoku: generador con solución única |
| `app/src/main/assets/simon.html`, `simon-interfaz.js`, `simon.js` | Simón dice |
| `app/src/main/assets/bloques.html`, `bloques-interfaz.js`, `bloques.js` | Bloques (piezas que caen) |
| `app/src/main/assets/ladrillos.html`, `ladrillos-interfaz.js`, `ladrillos.js` | Rompeladrillos |
| `app/src/main/assets/solitario.html`, `solitario-interfaz.js`, `solitario.js` | Solitario (Klondike) |
| `app/src/main/java/es/pablo/tresenraya/` | Actividad Android (WebView), vibración y autoactualización |
| `herramientas/` | Pruebas (`todas.js` las lanza todas) y `plantilla/` para empezar un juego nuevo |

## Añadir un juego

1. Copia los archivos de `herramientas/plantilla/` como explica su [LEEME](herramientas/plantilla/LEEME.md).
2. Añade una entrada en `app/src/main/assets/juegos.js`: el menú se genera solo.
3. `node herramientas/todas.js`: el workflow no hay que tocarlo.
