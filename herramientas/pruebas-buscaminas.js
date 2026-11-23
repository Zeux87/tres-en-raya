// Pruebas del Buscaminas. Ejecutar con: node herramientas/pruebas-buscaminas.js
'use strict';
var path = require('path');
var B = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'buscaminas.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function semilla(s) {
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}
function contarMinas(t) { return t.mina.filter(Boolean).length; }

// Vecinos en esquina, borde y centro
var t = B.nuevo(4, 5, 3);
comprobar(B.vecinos(t, 0).length === 3, 'esquina con 3 vecinos');
comprobar(B.vecinos(t, 2).length === 5, 'borde con 5 vecinos');
comprobar(B.vecinos(t, 6).length === 8, 'centro con 8 vecinos');

// El primer toque nunca es mina ni tiene minas alrededor
Object.keys(B.NIVELES).forEach(function (nombre) {
  var n = B.NIVELES[nombre];
  for (var s = 1; s <= 40; s++) {
    var az = semilla(s);
    var tt = B.nuevo(n.filas, n.cols, n.minas);
    var primera = Math.floor(az() * n.filas * n.cols);
    var abiertas = B.descubrir(tt, primera, az);
    comprobar(contarMinas(tt) === n.minas, nombre + ': número de minas');
    comprobar(!tt.mina[primera] && B.cuenta(tt, primera) === 0, nombre + ': primer toque seguro');
    comprobar(abiertas.length > 1 && tt.fase === 'jugando' || tt.fase === 'ganada', nombre + ': el primer toque abre una zona');
  }
});

// Tablero hecho a mano: minas en 0 y 4 de un 3x3
//   M 1 .     (fila 0)
//   1 M .     -> la 4 es el centro
//   . . .
function aMano() {
  var x = B.nuevo(3, 3, 2);
  x.mina[0] = true; x.mina[4] = true; x.fase = 'jugando';
  return x;
}
var m = aMano();
comprobar(B.cuenta(m, 1) === 2 && B.cuenta(m, 8) === 1, 'cuenta de minas alrededor');
B.descubrir(m, 8);
comprobar(m.abierta[8] && !m.abierta[7], 'un número no se expande');
comprobar(B.alternarBandera(m, 4) && m.bandera[4], 'poner bandera');
comprobar(B.descubrir(m, 4).length === 0, 'con bandera no se abre');
comprobar(!B.alternarBandera(m, 8), 'no se pone bandera en una abierta');
// Descubrir alrededor del 8 (tiene 1 mina = la 4, con bandera) abre 5 y 7
B.descubrirAlrededor(m, 8);
comprobar(m.abierta[5] && m.abierta[7] && m.fase === 'jugando', 'abrir alrededor de un número');
['1', '2', '3', '6'].forEach(function (c) { B.descubrir(m, +c); });
comprobar(m.fase === 'ganada' && m.bandera[0] && m.bandera[4], 'victoria al abrir todo lo que no es mina');

var p = aMano();
B.descubrir(p, 0);
comprobar(p.fase === 'perdida' && p.explotada === 0, 'pisar una mina');
comprobar(B.descubrir(p, 8).length === 0, 'tras perder no se puede seguir');

// Una bandera mal puesta hace explotar al abrir alrededor
var q = aMano();
B.descubrir(q, 8);
B.alternarBandera(q, 5);
B.descubrirAlrededor(q, 8);
comprobar(q.fase === 'perdida', 'bandera mal puesta: se abre la mina');

// Expansión de ceros: 5x5 con una sola mina en la esquina
var z = B.nuevo(5, 5, 1);
z.mina[24] = true; z.fase = 'jugando';
B.descubrir(z, 0);
comprobar(z.fase === 'ganada', 'un cero abre todo el tablero libre');

// Guardar y cargar
var g = B.nuevo(10, 8, 10);
B.descubrir(g, 30, semilla(9));
var cargado = JSON.parse(JSON.stringify(g));
comprobar(B.valido(cargado) && B.cuenta(cargado, 30) === 0, 'el tablero se guarda en JSON');
comprobar(!B.valido({ filas: 2, cols: 2 }), 'detecta un tablero roto');

if (fallos) {
  console.error(fallos + ' prueba(s) del Buscaminas fallida(s)');
  process.exit(1);
}
console.log('Pruebas del Buscaminas OK');
