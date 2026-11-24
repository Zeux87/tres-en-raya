// Lógica del Sudoku, sin DOM: generar, resolver y comprobar. La usan la pantalla y las pruebas.
// Los tableros son arrays de 81 números (0 = vacía), fila a fila.
(function (raiz, crear) {
  var S = crear();
  if (typeof module === 'object' && module.exports) module.exports = S;
  else raiz.Sudoku = S;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Pistas que quedan según el nivel (más pistas = más fácil)
  var PISTAS = { facil: 40, normal: 32, dificil: 26 };

  function fila(i) { return Math.floor(i / 9); }
  function col(i) { return i % 9; }
  function bloque(i) { return Math.floor(fila(i) / 3) * 3 + Math.floor(col(i) / 3); }

  // Casillas que "ven" a cada casilla (misma fila, columna o bloque)
  var VECINAS = [];
  for (var i = 0; i < 81; i++) {
    var v = [];
    for (var j = 0; j < 81; j++) {
      if (j !== i && (fila(j) === fila(i) || col(j) === col(i) || bloque(j) === bloque(i))) v.push(j);
    }
    VECINAS.push(v);
  }

  function posibles(t, i) {
    var usados = 0;
    VECINAS[i].forEach(function (j) { if (t[j]) usados |= 1 << t[j]; });
    var res = [];
    for (var n = 1; n <= 9; n++) if (!(usados & (1 << n))) res.push(n);
    return res;
  }

  function mezclar(a, azar) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(azar() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  // Cuenta soluciones (hasta "limite"). Rellena "t" con la primera si "guardar" es un array.
  function contar(t, limite, azar, guardar) {
    t = t.slice();
    var n = 0;
    function paso() {
      // La casilla vacía con menos opciones
      var mejor = -1, ops = null;
      for (var i = 0; i < 81; i++) {
        if (t[i]) continue;
        var p = posibles(t, i);
        if (!p.length) return false;
        if (!ops || p.length < ops.length) { mejor = i; ops = p; if (p.length === 1) break; }
      }
      if (mejor < 0) {
        n++;
        if (guardar && n === 1) for (var k = 0; k < 81; k++) guardar[k] = t[k];
        return n >= limite;
      }
      if (azar) mezclar(ops, azar);
      for (var o = 0; o < ops.length; o++) {
        t[mejor] = ops[o];
        if (paso()) return true;
      }
      t[mejor] = 0;
      return false;
    }
    paso();
    return n;
  }

  function resolver(t) {
    var s = [];
    return contar(t, 1, null, s) ? s : null;
  }

  function unica(t) { return contar(t, 2) === 1; }

  // { inicial, solucion }
  function generar(nivel, azar) {
    azar = azar || Math.random;
    var vacio = [];
    for (var i = 0; i < 81; i++) vacio.push(0);
    var solucion = [];
    contar(vacio, 1, azar, solucion);
    var t = solucion.slice();
    var meta = PISTAS[nivel] || PISTAS.normal;
    var quedan = 81;
    var orden = mezclar(Array.apply(null, Array(81)).map(function (_, k) { return k; }), azar);
    for (var o = 0; o < orden.length && quedan > meta; o++) {
      var k = orden[o], antes = t[k];
      t[k] = 0;
      if (unica(t)) quedan--;
      else t[k] = antes;
    }
    return { inicial: t, solucion: solucion };
  }

  // Casillas con un número repetido en su fila, columna o bloque
  function conflictos(t) {
    var res = [];
    for (var i = 0; i < 81; i++) {
      if (!t[i]) continue;
      for (var k = 0; k < VECINAS[i].length; k++) {
        if (t[VECINAS[i][k]] === t[i]) { res.push(i); break; }
      }
    }
    return res;
  }

  function completo(t, solucion) {
    for (var i = 0; i < 81; i++) if (t[i] !== solucion[i]) return false;
    return true;
  }

  function esTablero(t) {
    return Array.isArray(t) && t.length === 81 && t.every(function (x) { return x === (x | 0) && x >= 0 && x <= 9; });
  }

  return {
    PISTAS: PISTAS, VECINAS: VECINAS,
    fila: fila, col: col, bloque: bloque, posibles: posibles,
    contar: contar, resolver: resolver, unica: unica, generar: generar,
    conflictos: conflictos, completo: completo, esTablero: esTablero
  };
});
