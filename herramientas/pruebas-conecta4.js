// Pruebas de la lógica de Conecta 4. Ejecutar con: node herramientas/pruebas-conecta4.js
'use strict';
var path = require('path');
var C = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'conecta4.js'));

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
// Construye un tablero soltando fichas alternas en estas columnas (empieza R)
function jugar(cols) {
  var t = C.nuevo(), f = 'R';
  cols.forEach(function (c) { C.soltar(t, c, f); f = C.rival(f); });
  return t;
}

comprobar(C.LINEAS.length === 69, 'hay 69 líneas de 4');

// Caída de fichas
var t = C.nuevo();
comprobar(C.soltar(t, 3, 'R') === 38, 'la primera ficha cae abajo');
comprobar(C.soltar(t, 3, 'A') === 31, 'la segunda encima');
for (var i = 0; i < 4; i++) C.soltar(t, 3, 'R');
comprobar(C.filaLibre(t, 3) === -1 && C.soltar(t, 3, 'A') === -1, 'columna llena');
comprobar(C.columnasLibres(t).indexOf(3) < 0, 'columna llena no está libre');

// Victorias en las 4 direcciones
var h = jugar([0, 0, 1, 1, 2, 2, 3]);
comprobar(C.resultado(h) && C.resultado(h).ficha === 'R', 'horizontal');
var v = jugar([0, 1, 0, 1, 0, 1, 0]);
comprobar(C.resultado(v) && C.resultado(v).ficha === 'R', 'vertical');
var d1 = jugar([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
comprobar(C.resultado(d1) && C.resultado(d1).ficha === 'R', 'diagonal ascendente');
var d2 = jugar([6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
comprobar(C.resultado(d2) && C.resultado(d2).ficha === 'R', 'diagonal descendente');
comprobar(C.resultado(jugar([0, 1, 2])) === null, 'sin ganador todavía');

// El móvil remata y tapa
var remata = jugar([0, 6, 1, 6, 2]); // R tiene 0,1,2 abajo; le toca a A, que tiene dos en la 6
comprobar(C.jugadaMovil(remata, 'A', 'dificil') === 3, 'difícil tapa la horizontal');
comprobar(C.jugadaMovil(remata, 'A', 'normal') === 3, 'normal tapa la horizontal');
var gana = jugar([0, 6, 1, 6, 5, 6]); // A tiene tres en la 6
comprobar(C.jugadaMovil(gana, 'A', 'dificil') === 6, 'difícil remata');

// Partidas entre niveles: siempre jugadas válidas y el difícil gana al fácil
function partida(nivelR, nivelA, azar) {
  var t = C.nuevo(), turno = 'R';
  while (!C.resultado(t)) {
    var nivel = turno === 'R' ? nivelR : nivelA;
    var col = C.jugadaMovil(t, turno, nivel, azar, { ms: 120 });
    comprobar(col >= 0 && col < 7 && C.filaLibre(t, col) >= 0, nivel + ' eligió columna inválida');
    if (col < 0 || C.filaLibre(t, col) < 0) return 'error';
    C.soltar(t, col, turno);
    turno = C.rival(turno);
  }
  var r = C.resultado(t);
  return r === 'empate' ? 'empate' : r.ficha;
}
var cuenta = { dificilGana: 0, facilGana: 0, empates: 0 };
for (var n = 0; n < 16; n++) {
  var difEsR = n % 2 === 0;
  var r = partida(difEsR ? 'dificil' : 'facil', difEsR ? 'facil' : 'dificil', semilla(100 + n));
  if (r === 'empate') cuenta.empates++;
  else if ((r === 'R') === difEsR) cuenta.dificilGana++;
  else cuenta.facilGana++;
}
comprobar(cuenta.facilGana === 0, 'el fácil no debería ganar al difícil (' + JSON.stringify(cuenta) + ')');

var cn = { normalGana: 0, facilGana: 0 };
for (var m = 0; m < 16; m++) {
  var norEsR = m % 2 === 0;
  var rr = partida(norEsR ? 'normal' : 'facil', norEsR ? 'facil' : 'normal', semilla(500 + m));
  if (rr !== 'empate' && (rr === 'R') === norEsR) cn.normalGana++;
  else if (rr !== 'empate') cn.facilGana++;
}
comprobar(cn.normalGana > cn.facilGana * 2, 'el normal debería ganar casi siempre al fácil (' + JSON.stringify(cn) + ')');

// Tiempo de pensar del difícil con el tablero vacío (límite 900 ms)
var t0 = Date.now();
var b = C.buscar(C.nuevo(), 'R', 12, 900);
var ms = Date.now() - t0;
comprobar(ms < 1200, 'el difícil piensa demasiado: ' + ms + ' ms');

if (fallos) {
  console.error(fallos + ' prueba(s) de Conecta 4 fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Conecta 4 OK. Difícil vs fácil: ' + JSON.stringify(cuenta) +
  '; normal vs fácil: ' + JSON.stringify(cn) +
  '; el difícil llega a profundidad ' + b.profundidad + ' (' + b.nodos + ' posiciones en ' + ms + ' ms)');
