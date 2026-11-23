// Lógica de 2048: tablero de 4x4, mover y juntar fichas, añadir fichas nuevas.
// Tablero = array de 16 números (0 = vacío). Casilla = fila * 4 + columna.
// Direcciones: 'arriba', 'abajo', 'izq', 'der'.
(function (raiz) {
  'use strict';

  var LADO = 4;
  var TOTAL = LADO * LADO;
  var META = 2048;

  function vacio() {
    var t = [];
    for (var i = 0; i < TOTAL; i++) t.push(0);
    return t;
  }

  // Las 4 líneas que se mueven en esa dirección, cada una ordenada desde el lado hacia el que se empuja
  function lineas(dir) {
    var r = [];
    for (var a = 0; a < LADO; a++) {
      var l = [];
      for (var b = 0; b < LADO; b++) {
        if (dir === 'izq') l.push(a * LADO + b);
        else if (dir === 'der') l.push(a * LADO + (LADO - 1 - b));
        else if (dir === 'arriba') l.push(b * LADO + a);
        else l.push((LADO - 1 - b) * LADO + a);
      }
      r.push(l);
    }
    return r;
  }

  // Mueve el tablero. Devuelve { tablero, puntos, movido, fusiones: [casillas donde se juntaron] }
  // Cada ficha solo se junta una vez por movimiento (2 2 2 2 -> 4 4, no 8).
  function mover(t, dir) {
    var nuevo = t.slice(), puntos = 0, fusiones = [];
    lineas(dir).forEach(function (l) {
      var valores = l.map(function (i) { return t[i]; }).filter(function (v) { return v; });
      var salida = [];
      for (var k = 0; k < valores.length; k++) {
        if (k + 1 < valores.length && valores[k] === valores[k + 1]) {
          var v = valores[k] * 2;
          salida.push(v);
          puntos += v;
          fusiones.push(l[salida.length - 1]);
          k++;
        } else {
          salida.push(valores[k]);
        }
      }
      for (var j = 0; j < LADO; j++) nuevo[l[j]] = salida[j] || 0;
    });
    var movido = false;
    for (var i = 0; i < TOTAL; i++) if (nuevo[i] !== t[i]) { movido = true; break; }
    return { tablero: nuevo, puntos: puntos, movido: movido, fusiones: fusiones };
  }

  // Pone un 2 (90 %) o un 4 (10 %) en una casilla libre. Devuelve la casilla o -1.
  function anadir(t, azar) {
    azar = azar || Math.random;
    var libres = [];
    for (var i = 0; i < TOTAL; i++) if (!t[i]) libres.push(i);
    if (!libres.length) return -1;
    var c = libres[Math.floor(azar() * libres.length)];
    t[c] = azar() < 0.9 ? 2 : 4;
    return c;
  }

  function nuevo(azar) {
    var t = vacio();
    anadir(t, azar);
    anadir(t, azar);
    return t;
  }

  function puedeMover(t) {
    for (var i = 0; i < TOTAL; i++) {
      if (!t[i]) return true;
      var c = i % LADO;
      if (c < LADO - 1 && t[i] === t[i + 1]) return true;
      if (i + LADO < TOTAL && t[i] === t[i + LADO]) return true;
    }
    return false;
  }

  function maximo(t) { return Math.max.apply(null, t); }

  function valido(t) {
    if (!Array.isArray(t) || t.length !== TOTAL) return false;
    return t.every(function (v) { return v === 0 || (v >= 2 && (v & (v - 1)) === 0); });
  }

  var api = {
    LADO: LADO,
    TOTAL: TOTAL,
    META: META,
    vacio: vacio,
    nuevo: nuevo,
    mover: mover,
    anadir: anadir,
    puedeMover: puedeMover,
    maximo: maximo,
    valido: valido
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Juego2048 = api;
})(this);
