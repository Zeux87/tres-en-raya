# 3 en raya

Juego de 3 en raya para Android.

- **Contra el móvil** con tres niveles: Fácil, Normal e Imposible (juego perfecto: nunca pierde).
- **2 jugadores** en el mismo móvil.
- Marcador guardado por modo y dificultad; quien empieza se alterna en cada partida.
- Tema claro/oscuro automático y vibración al jugar.
- **Se actualiza sola**: al abrirla comprueba si hay una versión nueva en Releases y la instala.

## Instalar

Descarga `tres-en-raya.apk` de la [última versión](https://github.com/Zeux87/tres-en-raya/releases/latest) y ábrelo en el móvil
(la primera vez Android pedirá permitir la instalación desde el navegador o el gestor de archivos).

## Cómo se publica una versión

Cada `push` a `main` lanza GitHub Actions (`.github/workflows/compilar.yml`), que:

1. Pasa las pruebas de la lógica (`node herramientas/pruebas.js`).
2. Compila el APK firmado con `app/tresenraya.jks`, usando el número de compilación como `versionCode`.
3. Lo publica en Releases como `v<número>`; la app detecta esa versión y se actualiza.

## Estructura

| Ruta | Qué hay |
|---|---|
| `app/src/main/assets/juego.js` | Lógica: ganador, minimax con poda alfa-beta y dificultades |
| `app/src/main/assets/index.html`, `interfaz.js` | Interfaz del juego |
| `app/src/main/java/es/pablo/tresenraya/` | Actividad Android (WebView), vibración y autoactualización |
| `herramientas/pruebas.js` | Pruebas; comprueba que el modo Imposible no pierde ninguna partida |
