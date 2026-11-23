// Pruebas de 2048. Ejecutar con: node herramientas/pruebas-2048.js
'use strict';
var path = require('path');
var J = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', '2048.js'));

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
function igual(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
// Tablero a partir de 4 filas
function T(f1, f2, f3, f4) { return f1.concat(f2, f3, f4); }

var t = T([2, 2, 2, 2], [2, 2, 4, 4], [0, 4, 0, 4], [8, 0, 0, 8]);

var izq = J.mover(t, 'izq');
comprobar(igual(izq.tablero, T([4, 4, 0, 0], [4, 8, 0, 0], [8, 0, 0, 0], [16, 0, 0, 0])), 'mover a la izquierda: ' + izq.tablero);
comprobar(izq.puntos === 4 + 4 + 4 + 8 + 8 + 16, 'puntos al juntar');
comprobar(izq.movido && izq.fusiones.length === 6, 'fusiones contadas');

var der = J.mover(t, 'der');
comprobar(igual(der.tablero, T([0, 0, 4, 4], [0, 0, 4, 8], [0, 0, 0, 8], [0, 0, 0, 16])), 'mover a la derecha: ' + der.tablero);

var col = T([2, 0, 0, 0], [2, 0, 0, 0], [4, 0, 0, 0], [0, 0, 0, 0]);
comprobar(igual(J.mover(col, 'arriba').tablero, T([4, 0, 0, 0], [4, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0])), 'mover arriba');
comprobar(igual(J.mover(col, 'abajo').tablero, T([0, 0, 0, 0], [0, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0])), 'mover abajo');

// Tres iguales: se juntan las del lado hacia el que se empuja
comprobar(igual(J.mover(T([2, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]), 'der').tablero.slice(0, 4), [0, 0, 2, 4]), '2 2 2 a la derecha = 2 4');
// 4 4 8 -> 8 8 (no 16)
comprobar(igual(J.mover(T([4, 4, 8, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]), 'izq').tablero.slice(0, 4), [8, 8, 0, 0]), 'cada ficha se junta solo una vez');

// Sin movimiento
var quieto = T([2, 4, 2, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
comprobar(!J.mover(quieto, 'izq').movido && !J.mover(quieto, 'arriba').movido, 'no se mueve si no puede');
comprobar(J.mover(quieto, 'abajo').movido, 'pero hacia abajo sí');

// Fin de partida
var lleno = T([2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]);
comprobar(!J.puedeMover(lleno), 'tablero bloqueado');
lleno[15] = 4; // ahora hay dos 4 juntos abajo a la derecha
comprobar(J.puedeMover(lleno), 'hay una pareja que juntar');

// Fichas nuevas
var az = semilla(3), doses = 0, cuatros = 0;
for (var i = 0; i < 400; i++) {
  var v = J.vacio(), c = J.anadir(v, az);
  if (v[c] === 2) doses++; else if (v[c] === 4) cuatros++;
}
comprobar(doses + cuatros === 400 && cuatros > 15 && cuatros < 80, 'salen sobre todo doses (' + doses + '/' + cuatros + ')');
comprobar(J.anadir(lleno, az) === -1, 'no cabe ninguna ficha');
var n = J.nuevo(semilla(4));
comprobar(n.filter(Boolean).length === 2, 'empieza con 2 fichas');

// Partidas al azar: la suma solo crece con las fichas nuevas y siempre es válido
var dirs = ['arriba', 'abajo', 'izq', 'der'], mejor = 0;
for (var s = 1; s <= 20; s++) {
  var a = semilla(s), tab = J.nuevo(a), jugadas = 0;
  while (J.puedeMover(tab) && jugadas < 5000) {
    var r = J.mover(tab, dirs[Math.floor(a() * 4)]);
    if (!r.movido) continue;
    var suma = r.tablero.reduce(function (x, y) { return x + y; }, 0);
    comprobar(suma === tab.reduce(function (x, y) { return x + y; }, 0), 'mover no cambia la suma');
    tab = r.tablero;
    J.anadir(tab, a);
    jugadas++;
  }
  comprobar(J.valido(tab), 'tablero válido');
  mejor = Math.max(mejor, J.maximo(tab));
}
comprobar(!J.valido([2, 3]), 'detecta un tablero roto');

if (fallos) {
  console.error(fallos + ' prueba(s) de 2048 fallida(s)');
  process.exit(1);
}
console.log('Pruebas de 2048 OK (jugando al azar se llega hasta ' + mejor + ')');
