// Lógica de las Damas (reglas españolas), sin DOM: la usan la pantalla y las pruebas en Node.
//
// Tablero de 8×8 en un array de 64. Solo se usan las casillas oscuras ((fila + col) impar).
// Piezas: 'b' peón blanco, 'B' dama blanca, 'n' peón negro, 'N' dama negra, null vacía.
// Blancas abajo (suben) y empiezan; negras arriba (bajan).
//  - Los peones mueven y comen solo hacia delante, en diagonal.
//  - Las damas son "voladoras": se mueven y comen a cualquier distancia.
//  - Comer es obligatorio y hay que elegir la jugada que más piezas come.
//  - Las piezas comidas se quitan al final del salto y no se pueden saltar dos veces.
//  - Un peón corona si acaba la jugada en la última fila.
//  - Pierde quien no puede mover. Empate tras 50 jugadas seguidas sin comer ni mover peones.
(function (raiz, crear) {
  var D = crear();
  if (typeof module === 'object' && module.exports) module.exports = D;
  else raiz.Damas = D;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var N = 8, TOTAL = 64, LIMITE_TABLAS = 50;
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  function nuevo() {
    var t = [];
    for (var i = 0; i < TOTAL; i++) {
      var r = Math.floor(i / N), c = i % N;
      t.push((r + c) % 2 === 1 ? (r < 3 ? 'n' : r > 4 ? 'b' : null) : null);
    }
    return t;
  }

  function estadoNuevo() { return { t: nuevo(), turno: 'B', calma: 0 }; }

  function lado(p) { return p ? p.toUpperCase() : null; }
  function esDama(p) { return !!p && p === p.toUpperCase(); }
  function rival(f) { return f === 'B' ? 'N' : 'B'; }
  function avance(f) { return f === 'B' ? -1 : 1; }
  function dentro(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

  // Saltos posibles desde "desde" con la pieza "p", sin repetir piezas comidas
  function capturasDesde(t, desde, p, comidas, camino, res) {
    var r0 = Math.floor(desde / N), c0 = desde % N, f = lado(p), alguno = false;
    for (var d = 0; d < 4; d++) {
      var dr = DIAG[d][0], dc = DIAG[d][1];
      if (!esDama(p) && dr !== avance(f)) continue;
      var r = r0 + dr, c = c0 + dc;
      if (esDama(p)) while (dentro(r, c) && !t[r * N + c]) { r += dr; c += dc; }
      if (!dentro(r, c)) continue;
      var v = r * N + c;
      if (lado(t[v]) !== rival(f) || comidas.indexOf(v) >= 0) continue;
      r += dr; c += dc;
      while (dentro(r, c) && !t[r * N + c]) {
        var destino = r * N + c;
        alguno = true;
        capturasDesde(t, destino, p, comidas.concat([v]), camino.concat([destino]), res);
        if (!esDama(p)) break;
        r += dr; c += dc;
      }
    }
    if (!alguno && comidas.length) res.push({ camino: camino, comidas: comidas });
  }

  // Todas las jugadas legales de "f": [{ camino: [desde, ..., hasta], comidas: [...] }]
  function jugadas(t, f) {
    var capturas = [], simples = [];
    for (var i = 0; i < TOTAL; i++) {
      var p = t[i];
      if (lado(p) !== f) continue;
      var tt = t.slice();
      tt[i] = null; // la pieza deja su casilla al saltar
      capturasDesde(tt, i, p, [], [i], capturas);
      if (capturas.length) continue;
      var r0 = Math.floor(i / N), c0 = i % N;
      for (var d = 0; d < 4; d++) {
        var dr = DIAG[d][0], dc = DIAG[d][1];
        if (!esDama(p) && dr !== avance(f)) continue;
        var r = r0 + dr, c = c0 + dc;
        while (dentro(r, c) && !t[r * N + c]) {
          simples.push({ camino: [i, r * N + c], comidas: [] });
          if (!esDama(p)) break;
          r += dr; c += dc;
        }
      }
    }
    if (!capturas.length) return simples;
    var max = capturas.reduce(function (m, j) { return Math.max(m, j.comidas.length); }, 0);
    return capturas.filter(function (j) { return j.comidas.length === max; });
  }

  // Aplica la jugada al estado { t, turno, calma } (la cambia). Devuelve true si coronó.
  function aplicar(e, j) {
    var t = e.t, desde = j.camino[0], hasta = j.camino[j.camino.length - 1], p = t[desde];
    t[desde] = null;
    j.comidas.forEach(function (k) { t[k] = null; });
    var fila = Math.floor(hasta / N), corona = false;
    if (p === 'b' && fila === 0) { p = 'B'; corona = true; }
    if (p === 'n' && fila === N - 1) { p = 'N'; corona = true; }
    t[hasta] = p;
    e.calma = j.comidas.length || !esDama(t[hasta]) || corona ? 0 : e.calma + 1;
    e.turno = rival(e.turno);
    return corona;
  }

  // Busca entre las legales la jugada con ese camino (para recibirla del otro móvil)
  function buscar(t, f, camino) {
    if (!Array.isArray(camino)) return null;
    var s = camino.join(',');
    var js = jugadas(t, f);
    for (var k = 0; k < js.length; k++) if (js[k].camino.join(',') === s) return js[k];
    return null;
  }

  // null si sigue; si no, { ganador: 'B'|'N'|null (tablas) }
  function resultado(e) {
    if (e.calma >= LIMITE_TABLAS) return { ganador: null };
    if (!jugadas(e.t, e.turno).length) return { ganador: rival(e.turno) };
    return null;
  }

  function cuenta(t) {
    var c = { B: 0, N: 0 };
    t.forEach(function (p) { if (p) c[lado(p)]++; });
    return c;
  }

  function valido(e) {
    return !!e && Array.isArray(e.t) && e.t.length === TOTAL && (e.turno === 'B' || e.turno === 'N') &&
      typeof e.calma === 'number' &&
      e.t.every(function (p) { return p === null || p === 'b' || p === 'B' || p === 'n' || p === 'N'; });
  }

  // ---------- El móvil ----------
  function evaluar(t, f) {
    var s = 0;
    for (var i = 0; i < TOTAL; i++) {
      var p = t[i];
      if (!p) continue;
      var r = Math.floor(i / N), c = i % N;
      var v = esDama(p) ? 300 : 100 + 4 * (lado(p) === 'B' ? N - 1 - r : r);
      if (c > 1 && c < 6 && r > 1 && r < 6) v += 3; // centro
      s += lado(p) === f ? v : -v;
    }
    return s;
  }

  function minimax(e, yo, prof, alfa, beta) {
    var js = jugadas(e.t, e.turno);
    if (!js.length) return e.turno === yo ? -100000 - prof : 100000 + prof;
    if (e.calma >= LIMITE_TABLAS) return 0;
    if (prof === 0) return evaluar(e.t, yo);
    var max = e.turno === yo;
    for (var k = 0; k < js.length; k++) {
      var c = { t: e.t.slice(), turno: e.turno, calma: e.calma };
      aplicar(c, js[k]);
      var v = minimax(c, yo, prof - 1, alfa, beta);
      if (max) { if (v > alfa) alfa = v; } else if (v < beta) beta = v;
      if (alfa >= beta) break;
    }
    return max ? alfa : beta;
  }

  // nivel: 'facil', 'normal' o 'dificil'. Devuelve una jugada o null.
  function jugadaMovil(e, nivel, azar) {
    azar = azar || Math.random;
    var js = jugadas(e.t, e.turno);
    if (!js.length) return null;
    if (nivel === 'facil' && azar() < 0.45) return js[Math.floor(azar() * js.length)];
    var prof = nivel === 'dificil' ? 6 : nivel === 'normal' ? 3 : 1;
    var mejor = [], mejorV = -Infinity;
    js.forEach(function (j) {
      var c = { t: e.t.slice(), turno: e.turno, calma: e.calma };
      aplicar(c, j);
      var v = minimax(c, e.turno, prof - 1, -Infinity, Infinity);
      if (v > mejorV) { mejorV = v; mejor = [j]; } else if (v === mejorV) mejor.push(j);
    });
    return mejor[Math.floor(azar() * mejor.length)];
  }

  return {
    N: N, TOTAL: TOTAL, LIMITE_TABLAS: LIMITE_TABLAS,
    nuevo: nuevo, estadoNuevo: estadoNuevo, lado: lado, esDama: esDama, rival: rival,
    jugadas: jugadas, aplicar: aplicar, buscar: buscar, resultado: resultado, cuenta: cuenta,
    valido: valido, jugadaMovil: jugadaMovil
  };
});
