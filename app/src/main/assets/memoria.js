// Lógica de Memoria (parejas): baraja, turnos, parejas y fin de partida.
// Las cartas son un array de símbolos; cada símbolo aparece exactamente dos veces.
// El estado guarda qué cartas están encontradas y cuáles están boca arriba ahora.
(function (raiz) {
  'use strict';

  var SIMBOLOS = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍉', '🍋', '🥕',
    '🐶', '🐱', '🦊', '🐸', '🐼', '🐵', '🦁', '🐙'];

  // Tamaños por nivel: columnas x filas (siempre un número par de cartas)
  var NIVELES = {
    facil: { cols: 4, filas: 3 },   // 6 parejas
    normal: { cols: 4, filas: 4 },  // 8 parejas
    dificil: { cols: 5, filas: 4 }  // 10 parejas
  };

  function barajar(lista, azar) {
    azar = azar || Math.random;
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(azar() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Crea las cartas para un número de parejas, barajadas
  function crearCartas(pares, azar) {
    if (pares < 1 || pares > SIMBOLOS.length) throw new Error('Número de parejas no válido: ' + pares);
    var elegidos = barajar(SIMBOLOS, azar).slice(0, pares);
    return barajar(elegidos.concat(elegidos), azar);
  }

  // Nueva partida. jugadores = 1 (solo) o 2
  function nueva(nivel, jugadores, azar) {
    var n = NIVELES[nivel] || NIVELES.normal;
    var cartas = crearCartas(n.cols * n.filas / 2, azar);
    return {
      cols: n.cols,
      filas: n.filas,
      cartas: cartas,
      encontradas: cartas.map(function () { return false; }),
      dueno: cartas.map(function () { return 0; }), // jugador que encontró la pareja (1 o 2)
      arriba: [],          // índices boca arriba sin resolver (0, 1 o 2)
      jugadores: jugadores === 2 ? 2 : 1,
      turno: 1,
      puntos: [0, 0, 0],   // puntos[1] y puntos[2]
      intentos: 0,         // parejas de cartas levantadas
      parejas: 0
    };
  }

  // Levanta la carta i. Devuelve:
  //   'invalida' si no se puede (ya encontrada, ya arriba o hay dos fallidas sin tapar)
  //   'primera'  primera carta del intento
  //   'pareja'   segunda carta y coinciden (se quedan descubiertas, repite turno)
  //   'fallo'    segunda carta y no coinciden (hay que llamar a tapar())
  function voltear(e, i) {
    if (i < 0 || i >= e.cartas.length || e.encontradas[i]) return 'invalida';
    if (e.arriba.length >= 2 || e.arriba.indexOf(i) >= 0) return 'invalida';
    e.arriba.push(i);
    if (e.arriba.length === 1) return 'primera';

    e.intentos++;
    var a = e.arriba[0], b = e.arriba[1];
    if (e.cartas[a] === e.cartas[b]) {
      e.encontradas[a] = e.encontradas[b] = true;
      e.dueno[a] = e.dueno[b] = e.turno;
      e.puntos[e.turno]++;
      e.parejas++;
      e.arriba = [];
      return 'pareja';
    }
    return 'fallo';
  }

  // Tapa las dos cartas de un fallo y pasa el turno (en 2 jugadores)
  function tapar(e) {
    if (e.arriba.length !== 2) return false;
    e.arriba = [];
    if (e.jugadores === 2) e.turno = e.turno === 1 ? 2 : 1;
    return true;
  }

  function terminada(e) {
    return e.parejas * 2 === e.cartas.length;
  }

  // Al terminar: en solo {intentos}; en 2 jugadores {ganador: 1, 2 o 0 si empate}
  function resultado(e) {
    if (!terminada(e)) return null;
    if (e.jugadores === 1) return { intentos: e.intentos };
    var g = e.puntos[1] > e.puntos[2] ? 1 : e.puntos[2] > e.puntos[1] ? 2 : 0;
    return { ganador: g, puntos: [e.puntos[1], e.puntos[2]] };
  }

  // ¿Es mejor récord? (menos intentos y, a igualdad, menos segundos)
  function mejorRecord(actual, nuevo) {
    if (!actual) return true;
    if (nuevo.intentos !== actual.intentos) return nuevo.intentos < actual.intentos;
    return nuevo.segundos < actual.segundos;
  }

  var api = {
    SIMBOLOS: SIMBOLOS,
    NIVELES: NIVELES,
    barajar: barajar,
    crearCartas: crearCartas,
    nueva: nueva,
    voltear: voltear,
    tapar: tapar,
    terminada: terminada,
    resultado: resultado,
    mejorRecord: mejorRecord
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Memoria = api;
})(this);
