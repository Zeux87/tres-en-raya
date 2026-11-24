// Pruebas de la lógica de Simón dice. Ejecutar con: node herramientas/pruebas-simon.js
'use strict';
var path = require('path');
var S = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'simon.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

var e = S.nuevo();
comprobar(e.secuencia.length === 1 && e.pos === 0 && S.puntos(e) === 0, 'empieza con un color');
comprobar(e.secuencia[0] >= 0 && e.secuencia[0] < S.COLORES, 'color válido');

// Repetir bien la secuencia completa
var fijo = { secuencia: [0, 2, 3], pos: 0 };
comprobar(S.pulsar(fijo, 0) === 'bien', 'primer color bien');
comprobar(S.pulsar(fijo, 2) === 'bien', 'segundo color bien');
comprobar(S.pulsar(fijo, 3) === 'ronda', 'secuencia completa');
S.crecer(fijo, function () { return 0.3; });
comprobar(fijo.secuencia.length === 4 && fijo.secuencia[3] === 1 && fijo.pos === 0, 'crece en uno y vuelve al principio');
comprobar(S.puntos(fijo) === 3, 'tres rondas superadas');

// Fallar
var f2 = { secuencia: [1, 1], pos: 0 };
comprobar(S.pulsar(f2, 2) === 'mal', 'color equivocado');

// Los 4 colores salen alguna vez
var vistos = {};
var g = S.nuevo();
for (var i = 0; i < 200; i++) S.crecer(g);
g.secuencia.forEach(function (c) { vistos[c] = true; });
comprobar(Object.keys(vistos).length === 4, 'salen los 4 colores');

// La velocidad sube con la secuencia, con un límite, y depende del nivel
comprobar(S.duracion('normal', 1) > S.duracion('normal', 10), 'se acelera');
comprobar(S.duracion('normal', 500) === S.duracion('normal', 1000), 'con un límite');
comprobar(S.duracion('lento', 5) > S.duracion('normal', 5) && S.duracion('normal', 5) > S.duracion('rapido', 5), 'niveles');
comprobar(S.duracion('raro', 1) === S.duracion('normal', 1), 'nivel desconocido = normal');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Simón dice OK');
