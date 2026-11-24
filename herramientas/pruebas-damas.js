// Pruebas de la lógica de las Damas. Ejecutar con: node herramientas/pruebas-damas.js
'use strict';
var path = require('path');
var D = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'damas.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function vacio() { var t = []; for (var i = 0; i < 64; i++) t.push(null); return t; }
function cas(r, c) { return r * 8 + c; }
function caminos(js) { return js.map(function (j) { return j.camino.join('-'); }).sort(); }

// 1. Inicio: 12 y 12, 7 jugadas para blancas
var e = D.estadoNuevo();
var c = D.cuenta(e.t);
comprobar(c.B === 12 && c.N === 12, '12 piezas por bando');
comprobar(D.jugadas(e.t, 'B').length === 7, '7 jugadas iniciales');
comprobar(D.jugadas(e.t, 'B').every(function (j) { return Math.floor(j.camino[1] / 8) === 4; }), 'las blancas suben');
comprobar(D.resultado(e) === null, 'sigue la partida');

// 2. Comer es obligatorio
var t = vacio();
t[cas(5, 2)] = 'b'; t[cas(4, 3)] = 'n'; t[cas(5, 6)] = 'b';
var js = D.jugadas(t, 'B');
comprobar(js.length === 1 && js[0].camino.join('-') === cas(5, 2) + '-' + cas(3, 4) && js[0].comidas[0] === cas(4, 3), 'obliga a comer');

// 3. Los peones no comen hacia atrás
var t2 = vacio();
t2[cas(3, 2)] = 'b'; t2[cas(4, 3)] = 'n';
comprobar(D.jugadas(t2, 'B').every(function (j) { return !j.comidas.length; }), 'el peón no come hacia atrás');

// 4. Comer en cadena y ley de la cantidad
var t3 = vacio();
t3[cas(7, 0)] = 'b'; t3[cas(6, 1)] = 'n'; t3[cas(4, 3)] = 'n'; // doble salto
t3[cas(7, 4)] = 'b'; t3[cas(6, 5)] = 'n'; // salto simple
var js3 = D.jugadas(t3, 'B');
comprobar(js3.length === 1 && js3[0].comidas.length === 2, 'hay que elegir la jugada que más come');
comprobar(js3[0].camino.join('-') === [cas(7, 0), cas(5, 2), cas(3, 4)].join('-'), 'camino del doble salto');

// 5. Dama voladora: se mueve lejos y come a distancia
var t4 = vacio();
t4[cas(7, 0)] = 'B';
var js4 = D.jugadas(t4, 'B');
comprobar(js4.length === 7, 'la dama sola en la esquina tiene 7 casillas');
t4[cas(4, 3)] = 'n';
var js5 = D.jugadas(t4, 'B');
comprobar(js5.length === 4 && js5.every(function (j) { return j.comidas[0] === cas(4, 3); }), 'la dama come a distancia y puede caer en 4 casillas');

// 6. No se salta dos veces la misma pieza y las comidas bloquean
var t5 = vacio();
t5[cas(4, 3)] = 'B'; t5[cas(3, 4)] = 'n';
var js6 = D.jugadas(t5, 'B');
comprobar(js6.every(function (j) { return j.comidas.length === 1; }), 'no repite pieza comida');

// 7. Aplicar: quita las comidas y corona al final
var e2 = { t: vacio(), turno: 'B', calma: 0 };
e2.t[cas(2, 1)] = 'b'; e2.t[cas(1, 2)] = 'n';
var j7 = D.jugadas(e2.t, 'B')[0];
var corona = D.aplicar(e2, j7);
comprobar(corona && e2.t[cas(0, 3)] === 'B' && e2.t[cas(1, 2)] === null && e2.turno === 'N', 'come, corona y pasa el turno');
var r = D.resultado(e2);
comprobar(r && r.ganador === 'B', 'sin piezas negras, ganan blancas');

// 8. Buscar la jugada que llega del otro móvil
var e3 = D.estadoNuevo();
var j8 = D.jugadas(e3.t, 'B')[2];
comprobar(D.buscar(e3.t, 'B', j8.camino) === null ? false : D.buscar(e3.t, 'B', j8.camino).camino.join() === j8.camino.join(), 'buscar encuentra la jugada');
comprobar(D.buscar(e3.t, 'B', [0, 1]) === null && D.buscar(e3.t, 'B', 'x') === null, 'buscar rechaza jugadas falsas');

// 9. Tablas tras 50 jugadas solo con damas sin comer
var e4 = { t: vacio(), turno: 'B', calma: 0 };
e4.t[cas(7, 0)] = 'B'; e4.t[cas(0, 1)] = 'N';
// Las dos damas van y vienen entre dos casillas
var vaiven = { B: [cas(7, 0), cas(6, 1)], N: [cas(0, 1), cas(1, 0)] };
for (var k = 0; k < D.LIMITE_TABLAS && !D.resultado(e4); k++) {
  var dest = vaiven[e4.turno][(Math.floor(k / 2) + 1) % 2];
  var jj = D.jugadas(e4.t, e4.turno).filter(function (j) { return j.camino[1] === dest; });
  if (!jj.length) break;
  D.aplicar(e4, jj[0]);
}
comprobar(D.resultado(e4) && D.resultado(e4).ganador === null, 'tablas por 50 jugadas sin comer');

// 10. El móvil come cuando hay que comer y juega legal en partidas enteras
['facil', 'normal', 'dificil'].forEach(function (nivel, n) {
  var azar = azarFijo(5 + n), ee = D.estadoNuevo(), pasos = 0;
  while (!D.resultado(ee) && pasos < 300) {
    var nivelTurno = ee.turno === 'B' ? nivel : 'facil';
    var j = D.jugadaMovil(ee, nivelTurno, azar);
    var legal = caminos(D.jugadas(ee.t, ee.turno)).indexOf(j.camino.join('-')) >= 0;
    if (!legal) { comprobar(false, nivel + ': jugada ilegal'); break; }
    D.aplicar(ee, j);
    pasos++;
  }
  comprobar(D.resultado(ee) !== null, nivel + ': la partida termina (' + pasos + ' jugadas)');
  comprobar(D.valido(ee), nivel + ': estado válido al final');
});

// 11. Difícil gana casi siempre a fácil
var ganadas = 0;
for (var p = 0; p < 4; p++) {
  var az = azarFijo(100 + p), ef = D.estadoNuevo(), pp = 0;
  while (!D.resultado(ef) && pp < 300) { D.aplicar(ef, D.jugadaMovil(ef, ef.turno === 'B' ? 'dificil' : 'facil', az)); pp++; }
  if (D.resultado(ef) && D.resultado(ef).ganador === 'B') ganadas++;
}
comprobar(ganadas >= 3, 'difícil gana a fácil (' + ganadas + ' de 4)');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de las Damas OK');
