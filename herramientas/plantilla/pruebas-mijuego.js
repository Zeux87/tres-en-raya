// Pruebas de la lógica de Mi juego. Ejecutar con: node herramientas/pruebas-mijuego.js
'use strict';
var path = require('path');
var M = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'mijuego.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

comprobar(M.resultado(M.nuevo()) === null, 'tablero vacío: sigue la partida');
comprobar(M.resultado(['A', 'A', 'A', null, null, null, null, null, null]).ganador === 'A', 'gana A');
var t = M.nuevo();
comprobar(t[M.jugadaMovil(t)] === null, 'el móvil elige una casilla libre');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Mi juego OK');
