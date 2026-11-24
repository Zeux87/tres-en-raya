// Lógica de Puntos y cajas, sin DOM: la usan la pantalla y las pruebas en Node.
//
// Rejilla de n×n cajas. Las rayas se numeran así:
//   horizontales: (n+1) filas × n columnas  -> índice fila*n + col
//   verticales:   n filas × (n+1) columnas  -> índice H + fila*(n+1) + col   (H = (n+1)*n)
// Quien cierra una caja se la queda y vuelve a jugar. Gana quien tenga más cajas.
(function (raiz, crear) {
  var C = crear();
  if (typeof module === 'object' && module.exports) module.exports = C;
  else raiz.Cajas = C;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function total(n) { return 2 * n * (n + 1); }
  function horizontales(n) { return (n + 1) * n; }

  function nuevo(n, turno) {
    var e = { n: n, lineas: [], cajas: [], turno: turno || 'A' };
    for (var i = 0; i < total(n); i++) e.lineas.push(null);
    for (var k = 0; k < n * n; k++) e.cajas.push(null);
    return e;
  }

  function rival(f) { return f === 'A' ? 'B' : 'A'; }

  // Las 4 rayas de la caja (fila, col): arriba, abajo, izquierda, derecha
  function lados(n, caja) {
    var r = Math.floor(caja / n), c = caja % n, H = horizontales(n);
    return [r * n + c, (r + 1) * n + c, H + r * (n + 1) + c, H + r * (n + 1) + c + 1];
  }

  // Cajas que toca una raya (1 o 2)
  function cajasDe(n, l) {
    var H = horizontales(n), res = [];
    if (l < H) {
      var r = Math.floor(l / n), c = l % n;
      if (r > 0) res.push((r - 1) * n + c);
      if (r < n) res.push(r * n + c);
    } else {
      var k = l - H, rv = Math.floor(k / (n + 1)), cv = k % (n + 1);
      if (cv > 0) res.push(rv * n + cv - 1);
      if (cv < n) res.push(rv * n + cv);
    }
    return res;
  }

  function puestas(e, caja) {
    return lados(e.n, caja).filter(function (l) { return e.lineas[l]; }).length;
  }

  function libres(e) {
    var res = [];
    e.lineas.forEach(function (x, i) { if (!x) res.push(i); });
    return res;
  }

  // Pone la raya del turno actual. Devuelve las cajas cerradas ([] si ninguna, null si no vale).
  // Si no cierra ninguna, pasa el turno.
  function jugar(e, l) {
    if (l < 0 || l >= e.lineas.length || e.lineas[l]) return null;
    e.lineas[l] = e.turno;
    var cerradas = cajasDe(e.n, l).filter(function (k) { return puestas(e, k) === 4; });
    cerradas.forEach(function (k) { e.cajas[k] = e.turno; });
    if (!cerradas.length) e.turno = rival(e.turno);
    return cerradas;
  }

  function cuenta(e) {
    var c = { A: 0, B: 0 };
    e.cajas.forEach(function (x) { if (x) c[x]++; });
    return c;
  }

  function terminada(e) { return e.lineas.every(function (x) { return x; }); }

  function resultado(e) {
    if (!terminada(e)) return null;
    var c = cuenta(e);
    return { ganador: c.A > c.B ? 'A' : c.B > c.A ? 'B' : null, A: c.A, B: c.B };
  }

  function valido(e) {
    return !!e && typeof e.n === 'number' && e.n >= 2 && e.n <= 8 &&
      Array.isArray(e.lineas) && e.lineas.length === total(e.n) &&
      Array.isArray(e.cajas) && e.cajas.length === e.n * e.n && (e.turno === 'A' || e.turno === 'B');
  }

  function copia(e) { return { n: e.n, lineas: e.lineas.slice(), cajas: e.cajas.slice(), turno: e.turno }; }

  // ---------- El móvil ----------
  function cierra(e, l) { return cajasDe(e.n, l).some(function (k) { return puestas(e, k) === 3; }); }
  // Una raya es "segura" si no deja ninguna caja con 3 lados
  function segura(e, l) { return cajasDe(e.n, l).every(function (k) { return puestas(e, k) < 2; }); }

  // Cuántas cajas se lleva el rival si juego "l" y él cierra todo lo que pueda
  function regalo(e, l) {
    var c = copia(e), yo = e.turno;
    jugar(c, l);
    var n = 0;
    while (c.turno !== yo && !terminada(c)) {
      var ls = libres(c).filter(function (x) { return cierra(c, x); });
      if (!ls.length) break;
      n += jugar(c, ls[0]).length;
    }
    return n;
  }

  // nivel: 'facil', 'normal' o 'dificil'
  function jugadaMovil(e, nivel, azar) {
    azar = azar || Math.random;
    var ls = libres(e);
    if (!ls.length) return -1;
    function alAzar(lista) { return lista[Math.floor(azar() * lista.length)]; }
    var cierran = ls.filter(function (l) { return cierra(e, l); });
    if (nivel === 'facil') {
      if (cierran.length && azar() < 0.6) return alAzar(cierran);
      return alAzar(ls);
    }
    if (cierran.length) return alAzar(cierran);
    var seguras = ls.filter(function (l) { return segura(e, l); });
    if (seguras.length) return alAzar(seguras);
    if (nivel === 'normal') return alAzar(ls);
    // Difícil: regala la cadena más corta
    var mejor = [], min = Infinity;
    ls.forEach(function (l) {
      var r = regalo(e, l);
      if (r < min) { min = r; mejor = [l]; } else if (r === min) mejor.push(l);
    });
    return alAzar(mejor);
  }

  return {
    total: total, horizontales: horizontales, nuevo: nuevo, rival: rival, lados: lados, cajasDe: cajasDe,
    libres: libres, jugar: jugar, cuenta: cuenta, terminada: terminada, resultado: resultado,
    valido: valido, copia: copia, regalo: regalo, jugadaMovil: jugadaMovil
  };
});
