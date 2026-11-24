// Lógica de Reversi, sin DOM: la usan la pantalla y las pruebas en Node.
// Tablero de 8×8 en un array de 64: null, 'N' (negras) o 'B' (blancas). Empiezan negras.
(function (raiz, crear) {
  var R = crear();
  if (typeof module === 'object' && module.exports) module.exports = R;
  else raiz.Reversi = R;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var N = 8, TOTAL = 64;
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  // Valor de cada casilla para el móvil: esquinas muy buenas, junto a ellas malas
  var PESOS = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100
  ];

  // Esquina más cercana de cada casilla
  var ESQUINA = [];
  for (var q = 0; q < TOTAL; q++) ESQUINA.push((Math.floor(q / N) < N / 2 ? 0 : N * (N - 1)) + (q % N < N / 2 ? 0 : N - 1));

  function nuevo() {
    var t = [];
    for (var i = 0; i < TOTAL; i++) t.push(null);
    t[27] = 'B'; t[28] = 'N'; t[35] = 'N'; t[36] = 'B';
    return t;
  }

  function rival(f) { return f === 'N' ? 'B' : 'N'; }

  // Fichas que se voltean si "f" pone en "i" (vacío si no es jugada válida)
  function volteos(t, i, f) {
    if (i < 0 || i >= TOTAL || t[i]) return [];
    var r0 = Math.floor(i / N), c0 = i % N, otro = rival(f), res = [];
    for (var d = 0; d < 8; d++) {
      var r = r0 + DIRS[d][0], c = c0 + DIRS[d][1], linea = [];
      while (r >= 0 && r < N && c >= 0 && c < N && t[r * N + c] === otro) {
        linea.push(r * N + c);
        r += DIRS[d][0];
        c += DIRS[d][1];
      }
      if (linea.length && r >= 0 && r < N && c >= 0 && c < N && t[r * N + c] === f) res = res.concat(linea);
    }
    return res;
  }

  function jugadas(t, f) {
    var res = [];
    for (var i = 0; i < TOTAL; i++) if (!t[i] && volteos(t, i, f).length) res.push(i);
    return res;
  }

  // Pone la ficha y voltea. Devuelve las fichas volteadas ([] si no era válida)
  function poner(t, i, f) {
    var v = volteos(t, i, f);
    if (!v.length) return [];
    t[i] = f;
    v.forEach(function (k) { t[k] = f; });
    return v;
  }

  function cuenta(t) {
    var c = { N: 0, B: 0 };
    t.forEach(function (x) { if (x) c[x]++; });
    return c;
  }

  // A quién le toca después de que "f" haya jugado: al rival, o otra vez a "f"
  // si el rival no puede, o null si nadie puede (fin)
  function siguiente(t, f) {
    var o = rival(f);
    if (jugadas(t, o).length) return o;
    if (jugadas(t, f).length) return f;
    return null;
  }

  // null si sigue; si no, { ganador: 'N'|'B'|null (empate), N, B }
  function resultado(t) {
    if (jugadas(t, 'N').length || jugadas(t, 'B').length) return null;
    var c = cuenta(t);
    return { ganador: c.N > c.B ? 'N' : c.B > c.N ? 'B' : null, N: c.N, B: c.B };
  }

  function valido(t) {
    return Array.isArray(t) && t.length === TOTAL && t.every(function (x) { return x === null || x === 'N' || x === 'B'; });
  }

  // ---------- El móvil ----------
  function evaluar(t, f) {
    var o = rival(f), s = 0, c = cuenta(t);
    if (c.N + c.B === TOTAL || (!jugadas(t, f).length && !jugadas(t, o).length)) {
      return (c[f] - c[o]) * 1000;
    }
    for (var i = 0; i < TOTAL; i++) {
      if (!t[i]) continue;
      // Junto a una esquina ya ocupada, la casilla deja de ser peligrosa
      var w = PESOS[i] < 0 && t[ESQUINA[i]] ? 5 : PESOS[i];
      s += t[i] === f ? w : -w;
    }
    s += 5 * (jugadas(t, f).length - jugadas(t, o).length);
    return s;
  }

  function minimax(t, turno, yo, prof, alfa, beta) {
    var js = jugadas(t, turno);
    if (prof === 0 || (!js.length && !jugadas(t, rival(turno)).length)) return evaluar(t, yo);
    if (!js.length) return minimax(t, rival(turno), yo, prof - 1, alfa, beta);
    var max = turno === yo;
    for (var k = 0; k < js.length; k++) {
      var c = t.slice();
      poner(c, js[k], turno);
      var v = minimax(c, rival(turno), yo, prof - 1, alfa, beta);
      if (max) { if (v > alfa) alfa = v; } else if (v < beta) beta = v;
      if (alfa >= beta) break;
    }
    return max ? alfa : beta;
  }

  // nivel: 'facil' (al azar, a veces la que más voltea), 'normal' (posición), 'dificil' (piensa 4 jugadas)
  function jugadaMovil(t, f, nivel, azar) {
    azar = azar || Math.random;
    var js = jugadas(t, f);
    if (!js.length) return -1;
    if (nivel === 'facil') {
      if (azar() < 0.5) return js[Math.floor(azar() * js.length)];
      return js.reduce(function (m, i) { return volteos(t, i, f).length > volteos(t, m, f).length ? i : m; }, js[0]);
    }
    var prof = nivel === 'dificil' ? 4 : 1;
    var mejor = [], mejorV = -Infinity;
    js.forEach(function (i) {
      var c = t.slice();
      poner(c, i, f);
      var v = minimax(c, rival(f), f, prof - 1, -Infinity, Infinity);
      if (v > mejorV) { mejorV = v; mejor = [i]; } else if (v === mejorV) mejor.push(i);
    });
    return mejor[Math.floor(azar() * mejor.length)];
  }

  return {
    N: N, TOTAL: TOTAL,
    nuevo: nuevo, rival: rival, volteos: volteos, jugadas: jugadas, poner: poner,
    cuenta: cuenta, siguiente: siguiente, resultado: resultado, valido: valido, jugadaMovil: jugadaMovil
  };
});
