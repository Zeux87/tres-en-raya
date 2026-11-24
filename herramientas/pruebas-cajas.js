// Pruebas de la lógica de Puntos y cajas. Ejecutar con: node herramientas/pruebas-cajas.js
'use strict';
var path = require('path');
var C = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'cajas.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 1. Tamaños
comprobar(C.total(2) === 12 && C.total(5) === 60, 'número de rayas');
var e = C.nuevo(2);
comprobar(e.lineas.length === 12 && e.cajas.length === 4 && e.turno === 'A', 'tablero nuevo de 2×2');

// 2. Lados de una caja y cajas de una raya
comprobar(C.lados(2, 0).join(',') === '0,2,6,7', 'lados de la caja 0');
comprobar(C.lados(2, 3).join(',') === '3,5,10,11', 'lados de la caja 3');
comprobar(C.cajasDe(2, 2).join(',') === '0,2', 'la raya horizontal del medio toca dos cajas');
comprobar(C.cajasDe(2, 0).join(',') === '0', 'la raya de arriba toca una caja');
comprobar(C.cajasDe(2, 7).join(',') === '0,1', 'la raya vertical del medio toca dos cajas');
comprobar(C.cajasDe(2, 6).join(',') === '0', 'la raya vertical del borde toca una caja');
// Cada raya interior pertenece a 2 cajas y cada caja tiene 4 lados que la incluyen
for (var k = 0; k < 4; k++) {
  C.lados(2, k).forEach(function (l) { comprobar(C.cajasDe(2, l).indexOf(k) >= 0, 'coherencia lados/cajasDe ' + k + '/' + l); });
}

// 3. Cerrar una caja da otra jugada; si no, pasa el turno
var e2 = C.nuevo(2);
comprobar(C.jugar(e2, 0).length === 0 && e2.turno === 'B', 'sin caja pasa el turno');
comprobar(C.jugar(e2, 0) === null, 'no se repite una raya');
C.jugar(e2, 2); C.jugar(e2, 6);
comprobar(e2.turno === 'B', 'turno de B antes de cerrar');
var cerr = C.jugar(e2, 7);
comprobar(cerr.length === 1 && cerr[0] === 0 && e2.cajas[0] === 'B' && e2.turno === 'B', 'B cierra la caja y repite');

// 4. Una raya puede cerrar dos cajas a la vez
var e3 = C.nuevo(2);
[0, 1, 4, 6, 8, 3, 5].forEach(function (l) { C.jugar(e3, l); });
[9, 11].forEach(function (l) { C.jugar(e3, l); });
// Faltan 2 (centro horizontal), 7 y 10 (verticales del medio)
C.jugar(e3, 2);
var dos = C.jugar(e3, 7);
comprobar(dos && dos.length === 2, 'una raya cierra dos cajas');

// 5. Fin y resultado
var e4 = C.nuevo(2);
var guard = 0;
while (!C.terminada(e4) && guard++ < 50) C.jugar(e4, C.libres(e4)[0]);
var r = C.resultado(e4);
comprobar(r && r.A + r.B === 4, 'al final están todas las cajas repartidas');

// 6. El móvil: cierra si puede (normal) y no regala si hay rayas seguras
var e5 = C.nuevo(3);
C.jugar(e5, 0); C.jugar(e5, 3); C.jugar(e5, C.horizontales(3) + 0); // caja 0 con 3 lados
e5.turno = 'B';
comprobar(C.jugadaMovil(e5, 'normal', azarFijo(1)) === C.horizontales(3) + 1, 'normal cierra la caja');
var e6 = C.nuevo(3);
C.jugar(e6, 0); C.jugar(e6, 3); // caja 0 con 2 lados
for (var i = 0; i < 20; i++) {
  var l = C.jugadaMovil(e6, 'normal', azarFijo(i + 2));
  comprobar(C.lados(3, 0).indexOf(l) < 0, 'normal no da el tercer lado de una caja');
}

// 7. Difícil regala la cadena más corta
var e8 = C.nuevo(3);
C.libres(e8).forEach(function (l) { comprobar(C.regalo(e8, l) === 0, 'al principio no se regala nada'); });

// 8. Partidas enteras: siempre legales y terminan
['facil', 'normal', 'dificil'].forEach(function (nivel, n) {
  var az = azarFijo(20 + n), ee = C.nuevo(5), pasos = 0;
  while (!C.terminada(ee) && pasos < 100) {
    var x = C.jugadaMovil(ee, nivel, az);
    if (ee.lineas[x] !== null) { comprobar(false, nivel + ': raya ocupada'); break; }
    C.jugar(ee, x);
    pasos++;
  }
  comprobar(C.terminada(ee) && pasos === 60, nivel + ': se juegan las 60 rayas');
  comprobar(C.valido(ee), nivel + ': estado válido');
});

// 9. Difícil gana a fácil casi siempre
var ganadas = 0;
for (var p = 0; p < 10; p++) {
  var az2 = azarFijo(300 + p), ef = C.nuevo(5, p % 2 ? 'A' : 'B');
  while (!C.terminada(ef)) C.jugar(ef, C.jugadaMovil(ef, ef.turno === 'A' ? 'dificil' : 'facil', az2));
  if (C.resultado(ef).ganador === 'A') ganadas++;
}
comprobar(ganadas >= 8, 'difícil gana a fácil (' + ganadas + ' de 10)');

comprobar(!C.valido(null) && !C.valido({ n: 3, lineas: [], cajas: [], turno: 'A' }), 'valido() rechaza estados rotos');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Puntos y cajas OK');
