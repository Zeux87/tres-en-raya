// Comprueba la lista de juegos (juegos.js) y que cada juego usa la plantilla común.
// Ejecutar con: node herramientas/pruebas-catalogo.js
'use strict';
var fs = require('fs');
var path = require('path');
var ASSETS = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
var JUEGOS = require(path.join(ASSETS, 'juegos.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

comprobar(Array.isArray(JUEGOS) && JUEGOS.length > 0, 'juegos.js exporta una lista no vacía');

var ids = {}, paginas = {};
JUEGOS.forEach(function (j, n) {
  var quien = j && j.id ? j.id : '#' + n;
  ['id', 'pagina', 'titulo', 'texto', 'icono'].forEach(function (campo) {
    comprobar(typeof j[campo] === 'string' && j[campo].trim() !== '', quien + ': falta "' + campo + '"');
  });
  if (typeof j.id !== 'string' || typeof j.pagina !== 'string') return;

  comprobar(/^[a-z0-9-]+$/.test(j.id), quien + ': el id solo puede tener minúsculas, números y guiones');
  comprobar(!ids[j.id], quien + ': id repetido');
  comprobar(!paginas[j.pagina], quien + ': página repetida (' + j.pagina + ')');
  ids[j.id] = paginas[j.pagina] = true;
  comprobar(j.pagina !== 'index.html', quien + ': la página no puede ser el menú');
  comprobar(j.icono.indexOf('<svg') < 0, quien + ': el icono va sin la etiqueta <svg>');

  var archivo = path.join(ASSETS, j.pagina);
  if (!fs.existsSync(archivo)) {
    comprobar(false, quien + ': no existe ' + j.pagina);
    return;
  }
  var html = fs.readFileSync(archivo, 'utf8');
  comprobar(html.indexOf('href="comun.css"') >= 0, j.pagina + ': no carga comun.css');
  comprobar(html.indexOf('src="plataforma.js"') >= 0, j.pagina + ': no carga plataforma.js');
  // plataforma.js debe ir antes que los scripts del juego
  var scripts = html.match(/<script src="[^"]+"/g) || [];
  comprobar(scripts.length && scripts[0] === '<script src="plataforma.js"', j.pagina + ': plataforma.js debe ser el primer script');
  scripts.forEach(function (s) {
    var src = s.slice('<script src="'.length, -1);
    comprobar(fs.existsSync(path.join(ASSETS, src)), j.pagina + ': no existe el script ' + src);
  });
  // "‹ Menú": escrito en el HTML o creado con Plataforma.barra()
  var usaBarra = scripts.some(function (s) {
    var nombre = s.slice('<script src="'.length, -1);
    var src = path.join(ASSETS, nombre);
    return nombre !== 'plataforma.js' && fs.existsSync(src) && /\bP(lataforma)?\.barra\b/.test(fs.readFileSync(src, 'utf8'));
  });
  comprobar(html.indexOf('class="volver"') >= 0 || usaBarra, j.pagina + ': no tiene botón "‹ Menú"');
  comprobar(html.indexOf('onclick=') < 0, j.pagina + ': usa onclick en el HTML (la plantilla ya conecta "‹ Menú")');
});

// El menú se genera desde la lista: no debe tener tarjetas escritas a mano
var menu = fs.readFileSync(path.join(ASSETS, 'index.html'), 'utf8');
comprobar(menu.indexOf('src="juegos.js"') >= 0, 'index.html no carga juegos.js');
comprobar(menu.indexOf('src="plataforma.js"') >= 0, 'index.html no carga plataforma.js');
comprobar(menu.indexOf('class="juego"') < 0, 'index.html tiene tarjetas escritas a mano');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Catálogo OK: ' + JUEGOS.map(function (j) { return j.titulo; }).join(', '));
