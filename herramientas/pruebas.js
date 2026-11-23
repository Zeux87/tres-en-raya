// Pruebas de la lógica del 3 en raya. Ejecutar con: node herramientas/pruebas.js
'use strict';
var path = require('path');
var T = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'juego.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

// resultado()
comprobar(T.resultado(['X', 'X', 'X', null, 'O', 'O', null, null, null]).ficha === 'X', 'fila ganadora');
comprobar(T.resultado(['O', 'X', 'X', null, 'O', 'X', null, null, 'O']).ficha === 'O', 'diagonal ganadora');
comprobar(T.resultado(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X']) === 'empate', 'empate');
comprobar(T.resultado([null, null, null, null, null, null, null, null, null]) === null, 'tablero vacío');

// Remata y tapa
comprobar(T.jugadaMovil(['O', 'O', null, 'X', 'X', null, null, null, null], 'O', 'imposible') === 2, 'imposible remata');
comprobar(T.jugadaMovil(['X', 'X', null, null, 'O', null, null, null, null], 'O', 'imposible') === 2, 'imposible tapa');
comprobar(T.jugadaMovil(['O', 'O', null, 'X', 'X', null, null, null, null], 'O', 'normal') === 2, 'normal remata');

// "Imposible" nunca pierde: se prueban TODAS las partidas posibles del humano,
// empezando él o empezando el móvil, y con varias semillas de azar.
var partidas = 0;
function explorar(t, turno, movil) {
  var r = T.resultado(t);
  if (r) {
    partidas++;
    comprobar(r === 'empate' || r.ficha === movil, 'el móvil imposible ha perdido: ' + JSON.stringify(t));
    return;
  }
  if (turno === movil) {
    // Se prueban todas las jugadas que el móvil podría elegir (todas las "mejores")
    var opciones = T.mejoresJugadas(t.slice(), movil);
    for (var i = 0; i < opciones.length; i++) {
      t[opciones[i]] = movil;
      explorar(t, T.rival(movil), movil);
      t[opciones[i]] = null;
    }
  } else {
    var huecos = T.libres(t);
    for (var j = 0; j < huecos.length; j++) {
      t[huecos[j]] = turno;
      explorar(t, movil, movil);
      t[huecos[j]] = null;
    }
  }
}
explorar([null, null, null, null, null, null, null, null, null], 'X', 'O'); // empieza el humano
explorar([null, null, null, null, null, null, null, null, null], 'O', 'O'); // empieza el móvil

// jugadaMovil siempre devuelve una casilla libre en todas las dificultades
['facil', 'normal', 'imposible'].forEach(function (d) {
  for (var n = 0; n < 300; n++) {
    var t = [null, null, null, null, null, null, null, null, null];
    var turno = n % 2 ? 'X' : 'O';
    while (!T.resultado(t)) {
      var c = T.jugadaMovil(t, turno, d);
      comprobar(c >= 0 && c < 9 && !t[c], d + ' eligió casilla ocupada o inválida');
      if (c < 0 || t[c]) break;
      t[c] = turno;
      turno = T.rival(turno);
    }
  }
});

console.log('Partidas exploradas contra el modo imposible: ' + partidas);
if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Todas las pruebas OK');
