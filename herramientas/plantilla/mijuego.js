// Lógica de Mi juego, sin DOM: la usan la pantalla y las pruebas en Node.
(function (raiz, crear) {
  var M = crear();
  if (typeof module === 'object' && module.exports) module.exports = M;
  else raiz.MiJuego = M;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function nuevo() { return [null, null, null, null, null, null, null, null, null]; }
  function rival(f) { return f === 'A' ? 'B' : 'A'; }

  // Devuelve null si sigue la partida, 'empate' o { ganador }
  function resultado(t) {
    // Ejemplo: gana quien llene la fila de arriba
    if (t[0] && t[0] === t[1] && t[1] === t[2]) return { ganador: t[0] };
    return t.every(function (c) { return c; }) ? 'empate' : null;
  }

  function jugadaMovil(t) {
    var libres = [];
    t.forEach(function (c, i) { if (!c) libres.push(i); });
    return libres.length ? libres[Math.floor(Math.random() * libres.length)] : -1;
  }

  return { nuevo: nuevo, rival: rival, resultado: resultado, jugadaMovil: jugadaMovil };
});
