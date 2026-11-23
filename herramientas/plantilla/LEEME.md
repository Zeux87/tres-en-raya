# Plantilla para un juego nuevo

Copia estos archivos y cambia `mijuego` por el nombre del juego (solo minúsculas, números y guiones):

| Copia | A |
|---|---|
| `mijuego.html` | `app/src/main/assets/mijuego.html` |
| `mijuego.js` | `app/src/main/assets/mijuego.js` (lógica, sin DOM: se puede probar con Node) |
| `mijuego-interfaz.js` | `app/src/main/assets/mijuego-interfaz.js` (pantalla) |
| `pruebas-mijuego.js` | `herramientas/pruebas-mijuego.js` |

Después añade su entrada en `app/src/main/assets/juegos.js` (id, página, título, texto e icono SVG):
el menú se genera solo. No hay que tocar `index.html` ni el workflow: `node herramientas/todas.js`
ejecuta cualquier `herramientas/pruebas*.js`, y `pruebas-catalogo.js` comprueba que la página existe
y usa la plantilla.

## Qué da la plantilla (`plataforma.js`)

- `Plataforma.almacen('mijuego')`: `leer(nombre, porDefecto)`, `escribir(nombre, valor)`, `borrar(nombre)`
  sobre `localStorage`, con claves `mijuego.<nombre>` y sin lanzar nunca.
- `Plataforma.partida('mijuego')`: `cargar()`, `guardar(estado, enCurso)`, `borrar()`. Guarda la partida
  a medias y el menú muestra "partida a medias" mientras esté en curso.
- `Plataforma.ajustes(datos, dificultades, porDefecto)`: modo `movil`/`dos`, dificultad y marcadores, corregidos.
- `Plataforma.marcadorDe(marcadores, clave, lados)`: el marcador de un modo, creado a 0 si falta.
- `Plataforma.marcador(nodo, lados)`: casilleros con `pintar`, `nombres`, `turno` y `saltar`.
- `Plataforma.segmentos(nodo, valor, alCambiar)`: selector `.segmentos` con botones `data-valor`.
- `Plataforma.barra(titulo)`: barra con "‹ Menú" para pantallas pintadas desde JavaScript.
  Los `<a class="volver">` escritos en el HTML se conectan solos (vuelven atrás sin apilar menús).
- `Plataforma.vibrar(ms)` y `Plataforma.saltar(nodo)`.
