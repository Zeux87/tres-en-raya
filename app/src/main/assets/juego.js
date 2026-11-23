// Lógica del 3 en raya: tablero, ganador e inteligencia del móvil.
// El tablero es un array de 9 casillas con 'X', 'O' o null:
//   0 | 1 | 2
//   3 | 4 | 5
//   6 | 7 | 8
(function (raiz) {
  'use strict';

  var LINEAS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6]             // diagonales
  ];

  function rival(f) {
    return f === 'X' ? 'O' : 'X';
  }

  // Devuelve {ficha, linea} si alguien ha hecho 3 en raya, 'empate' si no quedan huecos, o null
  function resultado(t) {
    for (var i = 0; i < LINEAS.length; i++) {
      var l = LINEAS[i];
      if (t[l[0]] && t[l[0]] === t[l[1]] && t[l[0]] === t[l[2]]) {
        return { ficha: t[l[0]], linea: l.slice() };
      }
    }
    for (var c = 0; c < 9; c++) if (!t[c]) return null;
    return 'empate';
  }

  function libres(t) {
    var r = [];
    for (var i = 0; i < 9; i++) if (!t[i]) r.push(i);
    return r;
  }

  // Minimax con poda alfa-beta. Puntúa desde el punto de vista de "yo":
  // ganar pronto vale más que ganar tarde, y perder tarde es mejor que perder pronto.
  function minimax(t, turno, yo, prof, alfa, beta) {
    var r = resultado(t);
    if (r === 'empate') return 0;
    if (r) return r.ficha === yo ? 10 - prof : prof - 10;

    var huecos = libres(t);
    var maximiza = turno === yo;
    var mejor = maximiza ? -Infinity : Infinity;
    for (var i = 0; i < huecos.length; i++) {
      var c = huecos[i];
      t[c] = turno;
      var v = minimax(t, rival(turno), yo, prof + 1, alfa, beta);
      t[c] = null;
      if (maximiza) {
        if (v > mejor) mejor = v;
        if (v > alfa) alfa = v;
      } else {
        if (v < mejor) mejor = v;
        if (v < beta) beta = v;
      }
      if (beta <= alfa) break;
    }
    return mejor;
  }

  // Todas las mejores jugadas (empatadas en puntuación) para variar entre partidas
  function mejoresJugadas(t, yo) {
    var huecos = libres(t);
    var mejor = -Infinity;
    var lista = [];
    for (var i = 0; i < huecos.length; i++) {
      var c = huecos[i];
      t[c] = yo;
      var v = minimax(t, rival(yo), yo, 1, -Infinity, Infinity);
      t[c] = null;
      if (v > mejor) {
        mejor = v;
        lista = [c];
      } else if (v === mejor) {
        lista.push(c);
      }
    }
    return lista;
  }

  // Casilla que completa un 3 en raya para "ficha", o -1
  function jugadaGanadora(t, ficha) {
    var huecos = libres(t);
    for (var i = 0; i < huecos.length; i++) {
      t[huecos[i]] = ficha;
      var r = resultado(t);
      t[huecos[i]] = null;
      if (r && r !== 'empate' && r.ficha === ficha) return huecos[i];
    }
    return -1;
  }

  function alAzar(lista, azar) {
    return lista[Math.floor(azar() * lista.length)];
  }

  // Elige la casilla del móvil según la dificultad: 'facil', 'normal' o 'imposible'.
  // "azar" es opcional (para las pruebas); por defecto Math.random.
  function jugadaMovil(t, yo, dificultad, azar) {
    azar = azar || Math.random;
    var copia = t.slice();
    var huecos = libres(copia);
    if (!huecos.length) return -1;

    if (dificultad === 'facil') {
      // Remata si puede la mitad de las veces; si no, juega donde caiga
      var gana = jugadaGanadora(copia, yo);
      if (gana >= 0 && azar() < 0.5) return gana;
      return alAzar(huecos, azar);
    }

    if (dificultad === 'normal') {
      // Siempre remata, casi siempre tapa, y a veces se despista
      var g = jugadaGanadora(copia, yo);
      if (g >= 0) return g;
      var tapa = jugadaGanadora(copia, rival(yo));
      if (tapa >= 0 && azar() < 0.85) return tapa;
      if (azar() < 0.55) return alAzar(mejoresJugadas(copia, yo), azar);
      return alAzar(huecos, azar);
    }

    // Imposible: juego perfecto, nunca pierde
    return alAzar(mejoresJugadas(copia, yo), azar);
  }

  var api = {
    LINEAS: LINEAS,
    rival: rival,
    resultado: resultado,
    libres: libres,
    mejoresJugadas: mejoresJugadas,
    jugadaGanadora: jugadaGanadora,
    jugadaMovil: jugadaMovil
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.TresEnRaya = api;
})(this);
