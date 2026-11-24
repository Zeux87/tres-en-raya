// Lógica de Bloques (piezas que caen), sin DOM: la usan la pantalla y las pruebas en Node.
// Tablero de 10×20 en un array de 200: 0 vacía o 1..7 (el tipo de pieza que la ocupa).
(function (raiz, crear) {
  var B = crear();
  if (typeof module === 'object' && module.exports) module.exports = B;
  else raiz.Bloques = B;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var COLS = 10, FILAS = 20;

  // Formas en su primera posición; las demás se sacan girando
  var FORMAS = {
    1: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    2: [[1, 1], [1, 1]],                                          // O
    3: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],                         // T
    4: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],                         // S
    5: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],                         // Z
    6: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],                         // J
    7: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]                          // L
  };
  var PUNTOS_LINEAS = [0, 100, 300, 500, 800];

  function girar(m) {
    var n = m.length, r = [];
    for (var y = 0; y < n; y++) {
      r.push([]);
      for (var x = 0; x < n; x++) r[y].push(m[n - 1 - x][y]);
    }
    return r;
  }
  // GIROS[tipo][rot] = lista de [x, y] ocupadas
  var GIROS = {};
  Object.keys(FORMAS).forEach(function (k) {
    var m = FORMAS[k], lista = [];
    for (var r = 0; r < 4; r++) {
      var celdas = [];
      m.forEach(function (fila, y) { fila.forEach(function (v, x) { if (v) celdas.push([x, y]); }); });
      lista.push(celdas);
      m = girar(m);
    }
    GIROS[k] = lista;
  });

  function celdas(p) {
    return GIROS[p.tipo][p.rot].map(function (c) { return [p.x + c[0], p.y + c[1]]; });
  }

  function cabe(t, p) {
    return celdas(p).every(function (c) {
      return c[0] >= 0 && c[0] < COLS && c[1] < FILAS && (c[1] < 0 || !t[c[1] * COLS + c[0]]);
    });
  }

  function sacarDeBolsa(e, azar) {
    if (!e.bolsa.length) {
      var b = [1, 2, 3, 4, 5, 6, 7];
      for (var i = b.length - 1; i > 0; i--) {
        var j = Math.floor(azar() * (i + 1));
        var x = b[i]; b[i] = b[j]; b[j] = x;
      }
      e.bolsa = b;
    }
    return e.bolsa.shift();
  }

  function nacer(e, tipo) {
    var ancho = FORMAS[tipo].length;
    return { tipo: tipo, rot: 0, x: Math.floor((COLS - ancho) / 2), y: tipo === 1 ? -1 : 0 };
  }

  function nuevo(nivelInicial, azar) {
    azar = azar || Math.random;
    var e = { t: [], bolsa: [], puntos: 0, lineas: 0, nivelInicial: nivelInicial || 1, nivel: nivelInicial || 1, fin: false };
    for (var i = 0; i < COLS * FILAS; i++) e.t.push(0);
    e.pieza = nacer(e, sacarDeBolsa(e, azar));
    e.siguiente = sacarDeBolsa(e, azar);
    return e;
  }

  function mover(e, dx) {
    if (e.fin) return false;
    var p = { tipo: e.pieza.tipo, rot: e.pieza.rot, x: e.pieza.x + dx, y: e.pieza.y };
    if (!cabe(e.t, p)) return false;
    e.pieza = p;
    return true;
  }

  // Gira (dir 1 horario, -1 antihorario), probando a desplazarla un poco si choca
  function rotar(e, dir) {
    if (e.fin) return false;
    var rot = (e.pieza.rot + (dir < 0 ? 3 : 1)) % 4;
    var empujes = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
    for (var k = 0; k < empujes.length; k++) {
      var p = { tipo: e.pieza.tipo, rot: rot, x: e.pieza.x + empujes[k][0], y: e.pieza.y + empujes[k][1] };
      if (cabe(e.t, p)) { e.pieza = p; return true; }
    }
    return false;
  }

  // Fija la pieza, borra líneas y saca la siguiente. Devuelve las filas borradas.
  function fijar(e, azar) {
    var arriba = false;
    celdas(e.pieza).forEach(function (c) {
      if (c[1] < 0) arriba = true;
      else e.t[c[1] * COLS + c[0]] = e.pieza.tipo;
    });
    var borradas = [];
    for (var y = 0; y < FILAS; y++) {
      var llena = true;
      for (var x = 0; x < COLS; x++) if (!e.t[y * COLS + x]) { llena = false; break; }
      if (llena) borradas.push(y);
    }
    borradas.forEach(function (fila) {
      e.t.splice(fila * COLS, COLS);
      for (var x = 0; x < COLS; x++) e.t.unshift(0);
    });
    if (borradas.length) {
      e.puntos += PUNTOS_LINEAS[borradas.length] * e.nivel;
      e.lineas += borradas.length;
      e.nivel = Math.max(e.nivelInicial, 1 + Math.floor(e.lineas / 10));
    }
    e.pieza = nacer(e, e.siguiente);
    e.siguiente = sacarDeBolsa(e, azar || Math.random);
    if (arriba || !cabe(e.t, e.pieza)) e.fin = true;
    return borradas;
  }

  // Baja una fila. Devuelve null si bajó, o las filas borradas (array) si se fijó.
  function bajar(e, azar, suave) {
    if (e.fin) return null;
    var p = { tipo: e.pieza.tipo, rot: e.pieza.rot, x: e.pieza.x, y: e.pieza.y + 1 };
    if (cabe(e.t, p)) {
      e.pieza = p;
      if (suave) e.puntos += 1;
      return null;
    }
    return fijar(e, azar);
  }

  // Cae del todo y se fija. Devuelve las filas borradas.
  function caer(e, azar) {
    if (e.fin) return [];
    var y = fondo(e);
    e.puntos += 2 * (y - e.pieza.y);
    e.pieza = { tipo: e.pieza.tipo, rot: e.pieza.rot, x: e.pieza.x, y: y };
    return fijar(e, azar);
  }

  // Fila a la que llegaría la pieza (para la sombra)
  function fondo(e) {
    var p = { tipo: e.pieza.tipo, rot: e.pieza.rot, x: e.pieza.x, y: e.pieza.y };
    while (cabe(e.t, { tipo: p.tipo, rot: p.rot, x: p.x, y: p.y + 1 })) p.y++;
    return p.y;
  }

  // Milisegundos entre caídas según el nivel
  function velocidad(nivel) { return Math.max(70, Math.round(800 * Math.pow(0.84, nivel - 1))); }

  function valido(e) {
    return !!e && Array.isArray(e.t) && e.t.length === COLS * FILAS && e.pieza && GIROS[e.pieza.tipo] &&
      GIROS[e.siguiente] && Array.isArray(e.bolsa) && typeof e.puntos === 'number' && !e.fin && cabe(e.t, e.pieza);
  }

  return {
    COLS: COLS, FILAS: FILAS, GIROS: GIROS,
    nuevo: nuevo, celdas: celdas, cabe: cabe, mover: mover, rotar: rotar, bajar: bajar, caer: caer,
    fondo: fondo, velocidad: velocidad, valido: valido
  };
});
