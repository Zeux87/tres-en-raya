# Juegos

App Android con siete juegos:

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

Además: tema claro/oscuro automático, vibración y **actualización automática** desde Releases.

## Instalar

Descarga `tres-en-raya.apk` de la [última versión](https://github.com/Zeux87/tres-en-raya/releases/latest) y ábrelo en el móvil
(la primera vez Android pedirá permitir la instalación desde el navegador o el gestor de archivos).

## Cómo se publica una versión

Cada `push` a `main` lanza GitHub Actions (`.github/workflows/compilar.yml`), que:

1. Pasa las pruebas de la lógica de cada juego (`herramientas/pruebas*.js`).
2. Compila el APK firmado con `app/tresenraya.jks`, usando el número de compilación como `versionCode`.
3. Lo publica en Releases como `v<número>`; la app detecta esa versión y se actualiza.

## Estructura

| Ruta | Qué hay |
|---|---|
| `app/src/main/assets/index.html` | Menú de inicio, versión y botón de actualizar |
| `app/src/main/assets/comun.css` | Estilos compartidos (colores, botones, modo oscuro) |
| `app/src/main/assets/tresenraya.html`, `interfaz.js`, `juego.js` | 3 en raya: pantalla, interfaz y lógica (minimax con poda alfa-beta) |
| `app/src/main/assets/conecta4.html`, `conecta4-interfaz.js`, `conecta4.js` | Conecta 4: pantalla, interfaz y lógica con la IA |
| `app/src/main/assets/flota.html`, `flota-interfaz.js`, `flota.js` | Hundir la flota: pantalla, interfaz y lógica |
| `app/src/main/assets/ppt.html`, `ppt-interfaz.js`, `ppt.js` | Piedra, papel o tijera |
| `app/src/main/assets/buscaminas.html`, `buscaminas-interfaz.js`, `buscaminas.js` | Buscaminas |
| `app/src/main/assets/snake.html`, `snake-interfaz.js`, `snake.js` | Snake |
| `app/src/main/assets/2048.html`, `2048-interfaz.js`, `2048.js` | 2048 |
| `app/src/main/java/es/pablo/tresenraya/` | Actividad Android (WebView), vibración y autoactualización |
| `herramientas/` | Pruebas de la lógica de los juegos |
