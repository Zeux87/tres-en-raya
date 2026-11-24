// Pruebas de la lógica del Solitario. Ejecutar con: node herramientas/pruebas-solitario.js
'use strict';
var path = require('path');
var S = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'solitario.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function carta(v, p) { return p * 13 + v - 1; } // carta(1, 0) = As de picas
function vacia(robar) {
  return { mazo: [], descarte: [], bases: [[], [], [], []], columnas: [0, 1, 2, 3, 4, 5, 6].map(function () { return { ocultas: [], visibles: [] }; }), robar: robar || 1, movimientos: 0 };
}

// 1. Reparto: 1..7 cartas por columna, 24 en el mazo, todo válido
var e = S.nuevo(1, azarFijo(1));
comprobar(e.columnas.every(function (c, i) { return c.ocultas.length === i && c.visibles.length === 1; }), 'columnas de 1 a 7');
comprobar(e.mazo.length === 24 && S.valido(e), '24 en el mazo y baraja completa');
comprobar(S.nombre(carta(1, 0)) === 'A♠' && S.nombre(carta(13, 1)) === 'K♥' && S.roja(carta(5, 2)) && !S.roja(carta(5, 3)), 'nombres y colores');

// 2. Robar de 1 en 1 y de 3 en 3, y dar la vuelta
var r1 = S.nuevo(1, azarFijo(2));
S.robar(r1);
comprobar(r1.descarte.length === 1 && r1.mazo.length === 23, 'roba 1');
var r3 = S.nuevo(3, azarFijo(2));
var primero = r3.mazo[r3.mazo.length - 1];
S.robar(r3);
comprobar(r3.descarte.length === 3 && r3.descarte[0] === primero, 'roba 3');
for (var k = 0; k < 7; k++) S.robar(r3);
comprobar(r3.mazo.length === 0 && r3.descarte.length === 24, 'mazo agotado');
S.robar(r3);
comprobar(r3.mazo.length === 24 && r3.descarte.length === 0 && r3.mazo[r3.mazo.length - 1] === primero, 'se da la vuelta en el mismo orden');

// 3. Bases: As primero, mismo palo y en orden
var b = vacia();
b.descarte = [carta(2, 1), carta(1, 1)];
comprobar(!S.puede(b, { tipo: 'descarte' }, { tipo: 'base', i: 0 }), 'el As de corazones no va a la base de picas');
comprobar(S.mover(b, { tipo: 'descarte' }, { tipo: 'base', i: 1 }), 'As a su base');
comprobar(S.mover(b, { tipo: 'descarte' }, { tipo: 'base', i: 1 }) && b.bases[1].length === 2, 'el 2 encima del As');

// 4. Columnas: color alterno y uno menos; solo reyes en vacías
var c = vacia();
c.columnas[0].visibles = [carta(8, 0)]; // 8♠
c.columnas[1].visibles = [carta(7, 1), carta(6, 0)]; // 7♥ 6♠
c.columnas[2].visibles = [carta(7, 3)]; // 7♣
c.columnas[3].ocultas = [carta(2, 2)];
c.columnas[3].visibles = [carta(13, 2)]; // K♦ con una oculta debajo
comprobar(S.puede(c, { tipo: 'columna', i: 1, k: 0 }, { tipo: 'columna', i: 0 }), '7♥ 6♠ sobre 8♠');
comprobar(!S.puede(c, { tipo: 'columna', i: 2, k: 0 }, { tipo: 'columna', i: 0 }), '7♣ no va sobre 8♠');
comprobar(!S.puede(c, { tipo: 'columna', i: 2, k: 0 }, { tipo: 'columna', i: 4 }), 'un 7 no va a una columna vacía');
comprobar(S.mover(c, { tipo: 'columna', i: 3, k: 0 }, { tipo: 'columna', i: 4 }), 'el rey va a la vacía');
comprobar(c.columnas[3].visibles.length === 1 && c.columnas[3].ocultas.length === 0, 'se destapa la oculta');
comprobar(S.mover(c, { tipo: 'columna', i: 1, k: 0 }, { tipo: 'columna', i: 0 }) && c.columnas[0].visibles.length === 3, 'se mueve un montón');
comprobar(!S.puede(c, { tipo: 'columna', i: 0, k: 0 }, { tipo: 'columna', i: 0 }), 'no se mueve a sí misma');

// 5. Mejor destino
var m = vacia();
m.bases[0] = [carta(1, 0)];
m.columnas[0].visibles = [carta(2, 0)];
m.columnas[1].visibles = [carta(3, 1)];
comprobar(JSON.stringify(S.mejorDestino(m, { tipo: 'columna', i: 0, k: 0 })) === '{"tipo":"base","i":0}', 'prefiere la base');
m.columnas[2].visibles = [carta(13, 0)];
comprobar(S.mejorDestino(m, { tipo: 'columna', i: 2, k: 0 }) === null, 'un rey solo no se mueve a otra vacía');

// 6. Final automático y victoria
var f = vacia();
for (var p = 0; p < 4; p++) for (var v = 13; v >= 1; v--) f.columnas[p].visibles.push(carta(v, p));
comprobar(S.resoluble(f) && S.valido(f), 'todo destapado');
var pasos = 0;
while (S.pasoFinal(f) && pasos < 60) pasos++;
comprobar(S.ganada(f) && pasos === 52, 'se termina solo en 52 pasos');

// 7. Jugar al azar nunca rompe la baraja
var j = S.nuevo(3, azarFijo(7)), az = azarFijo(8);
for (var n = 0; n < 2000; n++) {
  if (az() < 0.3) { S.robar(j); continue; }
  var o = az() < 0.5 ? { tipo: 'descarte' } : { tipo: 'columna', i: Math.floor(az() * 7), k: 0 };
  if (o.tipo === 'columna') o.k = Math.floor(az() * Math.max(1, j.columnas[o.i].visibles.length));
  var d = S.mejorDestino(j, o);
  if (d) S.mover(j, o, d);
}
comprobar(S.valido(j), 'tras 2000 jugadas al azar la baraja sigue completa');

// 8. hayJugadas
var h = vacia();
h.columnas[0].visibles = [carta(5, 0)];
h.columnas[1].visibles = [carta(9, 1)];
h.bases[0] = []; h.bases[1] = [];
comprobar(!S.hayJugadas(h), 'sin jugadas');
h.columnas[1].visibles = [carta(1, 1)];
comprobar(S.hayJugadas(h), 'el As puede subir');
comprobar(!S.valido(h) && !S.valido(null), 'valido() rechaza barajas incompletas');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas del Solitario OK');
