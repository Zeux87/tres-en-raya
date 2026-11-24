// Pruebas de la lógica del Sudoku. Ejecutar con: node herramientas/pruebas-sudoku.js
'use strict';
var path = require('path');
var S = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'sudoku.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function valida(sol) {
  for (var g = 0; g < 9; g++) {
    var f = {}, c = {}, b = {};
    for (var k = 0; k < 9; k++) {
      f[sol[g * 9 + k]] = 1;
      c[sol[k * 9 + g]] = 1;
      b[sol[(Math.floor(g / 3) * 3 + Math.floor(k / 3)) * 9 + (g % 3) * 3 + k % 3]] = 1;
    }
    if (Object.keys(f).length !== 9 || Object.keys(c).length !== 9 || Object.keys(b).length !== 9) return false;
  }
  return sol.every(function (x) { return x >= 1 && x <= 9; });
}

// 1. Vecinas: 20 por casilla
comprobar(S.VECINAS.every(function (v) { return v.length === 20; }), 'cada casilla ve a 20');
comprobar(S.bloque(0) === 0 && S.bloque(80) === 8 && S.bloque(30) === 4, 'bloques');

// 2. Un sudoku conocido se resuelve y tiene solución única
var conocido = (
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
).split('').map(Number);
var sol = S.resolver(conocido);
comprobar(sol && valida(sol), 'resuelve un sudoku conocido');
comprobar(sol && sol.slice(0, 9).join('') === '534678912', 'primera fila de la solución');
comprobar(S.unica(conocido), 'el sudoku conocido tiene solución única');
var vacio = conocido.map(function () { return 0; });
comprobar(!S.unica(vacio), 'un tablero vacío no tiene solución única');
var imposible = conocido.slice();
imposible[2] = 5; // dos 5 en la primera fila
comprobar(S.resolver(imposible) === null, 'un tablero imposible no tiene solución');

// 3. Generar en cada nivel: solución válida, pistas coherentes y única
['facil', 'normal', 'dificil'].forEach(function (nivel, n) {
  for (var vez = 0; vez < 3; vez++) {
    var g = S.generar(nivel, azarFijo(7 + n * 10 + vez));
    var pistas = g.inicial.filter(Boolean).length;
    comprobar(valida(g.solucion), nivel + ': solución válida');
    comprobar(g.inicial.every(function (x, i) { return !x || x === g.solucion[i]; }), nivel + ': las pistas coinciden con la solución');
    comprobar(pistas >= S.PISTAS[nivel] && pistas <= S.PISTAS[nivel] + 6, nivel + ': ' + pistas + ' pistas');
    comprobar(S.unica(g.inicial), nivel + ': solución única');
  }
});

// 4. Conflictos y completo
var t = vacio.slice();
t[0] = 4; t[8] = 4; t[40] = 4;
var cf = S.conflictos(t);
comprobar(cf.indexOf(0) >= 0 && cf.indexOf(8) >= 0 && cf.indexOf(40) < 0, 'conflictos en la misma fila');
comprobar(S.completo(sol, sol) && !S.completo(conocido, sol), 'completo()');
comprobar(S.esTablero(conocido) && !S.esTablero([1, 2]) && !S.esTablero(conocido.map(function () { return 10; })), 'esTablero()');

// 5. Posibles
comprobar(S.posibles(conocido, 2).join(',') === '1,2,4', 'posibles de la casilla 2');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas del Sudoku OK');
