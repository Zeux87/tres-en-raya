// Pruebas de la lógica de Memoria. Ejecutar con: node herramientas/pruebas-memoria.js
'use strict';
var path = require('path');
var M = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'memoria.js'));

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
function cuenta(lista) {
  var c = {};
  lista.forEach(function (x) { c[x] = (c[x] || 0) + 1; });
  return c;
}
// Índice de la pareja de la carta i
function pareja(e, i) {
  for (var k = 0; k < e.cartas.length; k++) if (k !== i && e.cartas[k] === e.cartas[i]) return k;
  return -1;
}

// Símbolos distintos y suficientes para el nivel más grande
comprobar(Object.keys(cuenta(M.SIMBOLOS)).length === M.SIMBOLOS.length, 'los símbolos no se repiten');
Object.keys(M.NIVELES).forEach(function (n) {
  var t = M.NIVELES[n].cols * M.NIVELES[n].filas;
  comprobar(t % 2 === 0, n + ': número par de cartas');
  comprobar(t / 2 <= M.SIMBOLOS.length, n + ': hay símbolos suficientes');
});

// Cada símbolo aparece exactamente dos veces, en todos los niveles
var azar = semilla(7);
['facil', 'normal', 'dificil'].forEach(function (n) {
  for (var r = 0; r < 50; r++) {
    var e = M.nueva(n, 1, azar);
    comprobar(e.cartas.length === e.cols * e.filas, n + ': tamaño del tablero');
    var c = cuenta(e.cartas);
    var ok = Object.keys(c).every(function (k) { return c[k] === 2; });
    comprobar(ok && Object.keys(c).length === e.cartas.length / 2, n + ': cada símbolo dos veces');
  }
});
comprobar(M.nueva('facil', 1).cartas.length === 12 && M.nueva('dificil', 1).cartas.length === 20, 'tamaños 12 y 20');
comprobar(M.nueva('raro', 1).cartas.length === 16, 'nivel desconocido usa normal');

// Barajar no pierde ni duplica cartas y no siempre deja el mismo orden
var base = [1, 2, 3, 4, 5, 6, 7, 8];
var b = M.barajar(base, semilla(3));
comprobar(b.slice().sort().join() === base.join() && base.join() === '1,2,3,4,5,6,7,8', 'barajar conserva las cartas');
var distintos = {};
for (var s = 1; s < 30; s++) distintos[M.crearCartas(6, semilla(s)).join('')] = true;
comprobar(Object.keys(distintos).length > 20, 'el reparto cambia entre partidas');

// Voltear: primera, inválidas, pareja y fallo
var e = M.nueva('facil', 1, semilla(11));
var a = 0, p = pareja(e, 0);
var otra = -1;
for (var k = 1; k < e.cartas.length; k++) if (e.cartas[k] !== e.cartas[0]) { otra = k; break; }
comprobar(M.voltear(e, -1) === 'invalida' && M.voltear(e, 99) === 'invalida', 'índices fuera del tablero');
comprobar(M.voltear(e, a) === 'primera', 'primera carta');
comprobar(M.voltear(e, a) === 'invalida', 'no se puede levantar la misma carta dos veces');
comprobar(M.voltear(e, otra) === 'fallo' && e.intentos === 1, 'fallo cuenta un intento');
comprobar(M.voltear(e, p) === 'invalida', 'con dos cartas falladas arriba no se levanta otra');
comprobar(M.tapar(e) && e.arriba.length === 0, 'tapar las dos falladas');
comprobar(!M.tapar(e), 'tapar sin cartas arriba no hace nada');
comprobar(M.voltear(e, a) === 'primera' && M.voltear(e, p) === 'pareja', 'pareja');
comprobar(e.encontradas[a] && e.encontradas[p] && e.parejas === 1 && e.intentos === 2, 'pareja encontrada');
comprobar(M.voltear(e, a) === 'invalida', 'una carta encontrada no se vuelve a levantar');
comprobar(M.resultado(e) === null && !M.terminada(e), 'partida sin terminar');

// Partida perfecta en solo: tantos intentos como parejas
e = M.nueva('dificil', 1, semilla(5));
for (var i = 0; i < e.cartas.length; i++) {
  if (e.encontradas[i]) continue;
  M.voltear(e, i);
  comprobar(M.voltear(e, pareja(e, i)) === 'pareja', 'pareja en partida perfecta');
}
comprobar(M.terminada(e) && M.resultado(e).intentos === 10, 'partida perfecta: 10 intentos');

// 2 jugadores: el turno pasa al fallar y se repite al acertar
e = M.nueva('normal', 2, semilla(9));
comprobar(e.turno === 1, 'empieza el jugador 1');
var x = 0, y = -1;
for (k = 1; k < e.cartas.length; k++) if (e.cartas[k] !== e.cartas[0]) { y = k; break; }
M.voltear(e, x); M.voltear(e, y); M.tapar(e);
comprobar(e.turno === 2, 'al fallar pasa el turno');
M.voltear(e, x); M.voltear(e, pareja(e, x));
comprobar(e.turno === 2 && e.puntos[2] === 1 && e.dueno[x] === 2, 'al acertar repite y suma');
// El jugador 2 termina todo: gana
for (i = 0; i < e.cartas.length; i++) {
  if (e.encontradas[i]) continue;
  M.voltear(e, i); M.voltear(e, pareja(e, i));
}
var r = M.resultado(e);
comprobar(r && r.ganador === 2 && r.puntos[0] === 0 && r.puntos[1] === 8, 'gana el jugador 2 por 8 a 0');
// Empate
e = M.nueva('normal', 2, semilla(4));
e.puntos = [0, 4, 4]; e.parejas = 8;
comprobar(M.resultado(e).ganador === 0, 'empate');

// Partidas al azar: siempre terminan y los intentos cuadran
azar = semilla(42);
for (var n = 0; n < 200; n++) {
  e = M.nueva(['facil', 'normal', 'dificil'][n % 3], 1 + n % 2, azar);
  var pasos = 0;
  while (!M.terminada(e) && pasos++ < 10000) {
    var res = M.voltear(e, Math.floor(azar() * e.cartas.length));
    if (res === 'fallo') M.tapar(e);
  }
  comprobar(M.terminada(e), 'la partida al azar termina');
  comprobar(e.intentos >= e.cartas.length / 2, 'nunca menos intentos que parejas');
  if (e.jugadores === 2) comprobar(e.puntos[1] + e.puntos[2] === e.cartas.length / 2, 'los puntos suman todas las parejas');
}

// Récords
comprobar(M.mejorRecord(null, { intentos: 9, segundos: 30 }), 'sin récord previo, cualquier partida es récord');
comprobar(M.mejorRecord({ intentos: 9, segundos: 30 }, { intentos: 8, segundos: 99 }), 'menos intentos es récord');
comprobar(!M.mejorRecord({ intentos: 9, segundos: 30 }, { intentos: 10, segundos: 5 }), 'más intentos no es récord');
comprobar(M.mejorRecord({ intentos: 9, segundos: 30 }, { intentos: 9, segundos: 20 }), 'a igualdad, menos tiempo');

if (fallos) {
  console.error(fallos + ' prueba(s) de Memoria fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Memoria OK');
