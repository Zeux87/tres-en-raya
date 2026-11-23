// Pruebas de Piedra, papel o tijera. Ejecutar con: node herramientas/pruebas-ppt.js
'use strict';
var path = require('path');
var P = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'ppt.js'));

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

// Reglas
comprobar(P.resultado('piedra', 'tijera') === 'gana', 'piedra gana a tijera');
comprobar(P.resultado('tijera', 'papel') === 'gana', 'tijera gana a papel');
comprobar(P.resultado('papel', 'piedra') === 'gana', 'papel gana a piedra');
comprobar(P.resultado('piedra', 'papel') === 'pierde', 'piedra pierde con papel');
comprobar(P.resultado('tijera', 'tijera') === 'empate', 'empate');

// Historial recortado y solo con jugadas válidas
var h = [];
for (var i = 0; i < 100; i++) h = P.anotar(h, 'piedra');
h = P.anotar(h, 'pistola');
comprobar(h.length === 60, 'el historial se recorta a 60');

// Juega N rondas contra un jugador con una estrategia; devuelve {T, E, M}
function enfrentar(estrategia, nivel, rondas, azar) {
  var hist = [], c = { T: 0, E: 0, M: 0 };
  for (var r = 0; r < rondas; r++) {
    var movil = P.jugadaMovil(hist, nivel, azar);
    comprobar(P.valida(movil), 'jugada del móvil no válida: ' + movil);
    var yo = estrategia(r, hist, azar);
    var res = P.resultado(yo, movil);
    if (res === 'gana') c.T++; else if (res === 'pierde') c.M++; else c.E++;
    hist = P.anotar(hist, yo);
  }
  return c;
}

var siempre = enfrentar(function () { return 'piedra'; }, 'listo', 100, semilla(1));
comprobar(siempre.M >= 75, 'el listo debería pillar a quien siempre saca piedra (' + JSON.stringify(siempre) + ')');

var ciclo = enfrentar(function (r) { return P.JUGADAS[r % 3]; }, 'listo', 120, semilla(2));
comprobar(ciclo.M >= 70, 'el listo debería pillar un ciclo piedra-papel-tijera (' + JSON.stringify(ciclo) + ')');

// Alguien que repite lo que acaba de sacar, salvo si pierde
var copion = enfrentar(function (r, hist, azar) {
  return hist.length && r % 4 !== 0 ? hist[hist.length - 1] : P.JUGADAS[Math.floor(azar() * 3)];
}, 'listo', 150, semilla(3));
comprobar(copion.M > copion.T, 'el listo debería ganar al que repite (' + JSON.stringify(copion) + ')');

// Contra alguien al azar nadie tiene ventaja clara
var azarListo = enfrentar(function (r, hist, azar) { return P.JUGADAS[Math.floor(azar() * 3)]; }, 'listo', 900, semilla(4));
comprobar(azarListo.T > 200 && azarListo.M > 200, 'contra el azar debería estar repartido (' + JSON.stringify(azarListo) + ')');

// El fácil saca de todo
var vistas = {};
var az = semilla(5);
for (var k = 0; k < 60; k++) vistas[P.jugadaMovil([], 'facil', az)] = true;
comprobar(Object.keys(vistas).length === 3, 'el fácil saca las tres jugadas');

if (fallos) {
  console.error(fallos + ' prueba(s) de piedra, papel o tijera fallida(s)');
  process.exit(1);
}
console.log('Pruebas de piedra, papel o tijera OK. Listo contra "siempre piedra": ' + JSON.stringify(siempre) +
  '; contra un ciclo: ' + JSON.stringify(ciclo) + '; contra el azar: ' + JSON.stringify(azarListo));
