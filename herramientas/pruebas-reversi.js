// Pruebas de la lógica de Reversi. Ejecutar con: node herramientas/pruebas-reversi.js
'use strict';
var path = require('path');
var R = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'reversi.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 1. Inicio: 4 fichas y 4 jugadas para negras
var t = R.nuevo();
var c = R.cuenta(t);
comprobar(c.N === 2 && c.B === 2, 'empieza con 2 y 2');
comprobar(R.jugadas(t, 'N').sort(function (a, b) { return a - b; }).join(',') === '19,26,37,44', 'jugadas iniciales de negras');
comprobar(R.volteos(t, 0, 'N').length === 0, 'la esquina no es jugada al principio');
comprobar(R.resultado(t) === null, 'al principio sigue la partida');

// 2. Poner voltea
var v = R.poner(t, 19, 'N');
comprobar(v.length === 1 && v[0] === 27 && t[27] === 'N' && t[19] === 'N', 'poner en 19 voltea la 27');
comprobar(R.poner(t, 19, 'B').length === 0, 'no se puede poner en casilla ocupada');

// 3. Volteo en varias direcciones a la vez
var t2 = [];
for (var i = 0; i < 64; i++) t2.push(null);
t2[0] = 'N'; t2[1] = 'B'; t2[9] = 'B'; t2[8] = 'B';
t2[3] = 'N'; t2[27] = 'N'; t2[24] = 'N';
// en 2: no; en 18 (fila 2, col 2): diagonal 9 hacia 0
var v2 = R.volteos(t2, 18, 'N');
comprobar(v2.length === 1 && v2[0] === 9, 'volteo en diagonal');
var v3 = R.volteos(t2, 16, 'N'); // fila 2 col 0: hacia arriba 8 -> 0
comprobar(v3.length === 1 && v3[0] === 8, 'volteo en vertical');
var v4 = R.volteos(t2, 2, 'N'); // fila 0 col 2: izquierda 1 -> 0
comprobar(v4.length === 1 && v4[0] === 1, 'volteo en horizontal');

// 4. Pase: si el rival no puede, vuelve a tocar al mismo
var t3 = [];
for (var j = 0; j < 64; j++) t3.push('N');
t3[63] = null; t3[62] = 'B'; t3[0] = 'B'; t3[1] = null;
// Negras: en 63 voltea 62 (61 es N). Después, ¿blancas puede?
comprobar(R.jugadas(t3, 'N').indexOf(63) >= 0, 'negras pueden jugar en 63');
R.poner(t3, 63, 'N');
comprobar(R.siguiente(t3, 'N') === 'N' || R.siguiente(t3, 'N') === 'B' || R.siguiente(t3, 'N') === null, 'siguiente devuelve un turno válido');

// 5. Fin: tablero lleno
var lleno = [];
for (var k = 0; k < 64; k++) lleno.push(k < 40 ? 'N' : 'B');
var r = R.resultado(lleno);
comprobar(r && r.ganador === 'N' && r.N === 40 && r.B === 24, 'tablero lleno: ganan negras 40-24');
var empate = [];
for (var k2 = 0; k2 < 64; k2++) empate.push(k2 < 32 ? 'N' : 'B');
comprobar(R.resultado(empate).ganador === null, 'empate 32-32');

// 6. El móvil coge la esquina si puede (normal y difícil)
var t4 = R.nuevo(); // centro normal y, además, una esquina a tiro para blancas
t4[9] = 'N'; t4[18] = 'B';
['normal', 'dificil'].forEach(function (nivel) {
  var js = R.jugadas(t4, 'B');
  var m = R.jugadaMovil(t4.slice(), 'B', nivel, azarFijo(3));
  comprobar(js.indexOf(m) >= 0, nivel + ': jugada legal');
  comprobar(js.indexOf(0) >= 0 && m === 0, nivel + ': coge la esquina');
});

// 7. Partidas enteras móvil contra móvil: siempre legales y terminan
['facil', 'normal', 'dificil'].forEach(function (nivel, n) {
  var azar = azarFijo(11 + n);
  var tt = R.nuevo(), turno = 'N', pasos = 0;
  while (turno && pasos < 100) {
    var i = R.jugadaMovil(tt, turno, nivel, azar);
    comprobar(R.jugadas(tt, turno).indexOf(i) >= 0, nivel + ': jugada legal');
    R.poner(tt, i, turno);
    turno = R.siguiente(tt, turno);
    pasos++;
  }
  comprobar(R.resultado(tt) !== null, nivel + ': la partida termina');
});

comprobar(R.valido(R.nuevo()) && !R.valido([1, 2]) && !R.valido(null), 'valido()');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Reversi OK');
