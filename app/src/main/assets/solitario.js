// Lógica del Solitario (Klondike), sin DOM: la usan la pantalla y las pruebas en Node.
//
// Cartas: números 0..51. Palo = floor(c / 13) (0 ♠, 1 ♥, 2 ♦, 3 ♣), valor = c % 13 + 1 (1 = As, 13 = Rey).
// Estado: { mazo, descarte, bases[4] (una por palo), columnas[7] { ocultas, visibles }, robar (1 o 3), movimientos }
// Orígenes: { tipo: 'descarte' } | { tipo: 'columna', i, k } (desde la carta k de las visibles) | { tipo: 'base', i }
// Destinos: { tipo: 'base', i } | { tipo: 'columna', i }
(function (raiz, crear) {
  var S = crear();
  if (typeof module === 'object' && module.exports) module.exports = S;
  else raiz.Solitario = S;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var PALOS = ['♠', '♥', '♦', '♣'];
  var NOMBRES = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function palo(c) { return Math.floor(c / 13); }
  function valor(c) { return c % 13 + 1; }
  function roja(c) { return palo(c) === 1 || palo(c) === 2; }

  function nuevo(robar, azar) {
    azar = azar || Math.random;
    var cartas = [];
    for (var i = 0; i < 52; i++) cartas.push(i);
    for (var j = cartas.length - 1; j > 0; j--) {
      var k = Math.floor(azar() * (j + 1));
      var x = cartas[j]; cartas[j] = cartas[k]; cartas[k] = x;
    }
    var e = { mazo: [], descarte: [], bases: [[], [], [], []], columnas: [], robar: robar === 3 ? 3 : 1, movimientos: 0 };
    for (var c = 0; c < 7; c++) {
      e.columnas.push({ ocultas: cartas.splice(0, c), visibles: cartas.splice(0, 1) });
    }
    e.mazo = cartas;
    return e;
  }

  // Roba del mazo al descarte; si el mazo está vacío, le da la vuelta al descarte
  function robar(e) {
    if (!e.mazo.length) {
      if (!e.descarte.length) return false;
      e.mazo = e.descarte.reverse();
      e.descarte = [];
    } else {
      var n = Math.min(e.robar, e.mazo.length);
      for (var i = 0; i < n; i++) e.descarte.push(e.mazo.pop());
    }
    e.movimientos++;
    return true;
  }

  // Cartas que se moverían desde un origen (null si no vale)
  function cartasDe(e, o) {
    if (!o) return null;
    if (o.tipo === 'descarte') return e.descarte.length ? [e.descarte[e.descarte.length - 1]] : null;
    if (o.tipo === 'base') {
      var b = e.bases[o.i];
      return b && b.length ? [b[b.length - 1]] : null;
    }
    if (o.tipo === 'columna') {
      var col = e.columnas[o.i];
      if (!col || o.k < 0 || o.k >= col.visibles.length) return null;
      return col.visibles.slice(o.k);
    }
    return null;
  }

  function cabeEn(e, cartas, d) {
    if (!cartas || !cartas.length || !d) return false;
    var c = cartas[0];
    if (d.tipo === 'base') {
      var b = e.bases[d.i];
      return !!b && cartas.length === 1 && palo(c) === d.i && valor(c) === b.length + 1;
    }
    if (d.tipo === 'columna') {
      var col = e.columnas[d.i];
      if (!col) return false;
      if (!col.visibles.length) return !col.ocultas.length && valor(c) === 13;
      var arriba = col.visibles[col.visibles.length - 1];
      return roja(arriba) !== roja(c) && valor(arriba) === valor(c) + 1;
    }
    return false;
  }

  function mismoSitio(o, d) {
    return (o.tipo === 'columna' || o.tipo === 'base') && o.tipo === d.tipo && o.i === d.i;
  }

  function puede(e, o, d) { return !mismoSitio(o, d) && cabeEn(e, cartasDe(e, o), d); }

  function mover(e, o, d) {
    if (!puede(e, o, d)) return false;
    var cartas;
    if (o.tipo === 'descarte') cartas = [e.descarte.pop()];
    else if (o.tipo === 'base') cartas = [e.bases[o.i].pop()];
    else {
      var col = e.columnas[o.i];
      cartas = col.visibles.splice(o.k);
      if (!col.visibles.length && col.ocultas.length) col.visibles.push(col.ocultas.pop());
    }
    if (d.tipo === 'base') e.bases[d.i].push(cartas[0]);
    else e.columnas[d.i].visibles = e.columnas[d.i].visibles.concat(cartas);
    e.movimientos++;
    return true;
  }

  // Mejor sitio para unas cartas al tocarlas: primero la base, luego una columna con cartas,
  // y una columna vacía solo si sirve de algo (no mover un rey que ya está solo en su columna)
  function mejorDestino(e, o) {
    var cartas = cartasDe(e, o);
    if (!cartas) return null;
    if (o.tipo !== 'base') {
      var b = { tipo: 'base', i: palo(cartas[0]) };
      if (cabeEn(e, cartas, b)) return b;
    }
    var vacia = null;
    for (var i = 0; i < 7; i++) {
      var d = { tipo: 'columna', i: i };
      if (mismoSitio(o, d) || !cabeEn(e, cartas, d)) continue;
      if (e.columnas[i].visibles.length) return d;
      if (!vacia) vacia = d;
    }
    if (vacia && o.tipo === 'columna' && o.k === 0 && !e.columnas[o.i].ocultas.length) return null;
    return vacia;
  }

  function ganada(e) { return e.bases.every(function (b) { return b.length === 13; }); }

  // Todo destapado: se puede terminar solo
  function resoluble(e) {
    return !e.mazo.length && !e.descarte.length && e.columnas.every(function (c) { return !c.ocultas.length; });
  }

  // Un paso del final automático: sube a la base la carta más baja posible. Devuelve true si movió.
  function pasoFinal(e) {
    var mejor = null, min = 99;
    for (var i = 0; i < 7; i++) {
      var col = e.columnas[i];
      if (!col.visibles.length) continue;
      var c = col.visibles[col.visibles.length - 1];
      if (valor(c) < min && cabeEn(e, [c], { tipo: 'base', i: palo(c) })) {
        min = valor(c);
        mejor = { tipo: 'columna', i: i, k: col.visibles.length - 1 };
      }
    }
    return mejor ? mover(e, mejor, { tipo: 'base', i: palo(cartasDe(e, mejor)[0]) }) : false;
  }

  // ¿Queda algún movimiento útil? (para avisar de que no hay salida)
  function hayJugadas(e) {
    if (e.mazo.length || e.descarte.length) {
      // Si alguna carta del mazo o descarte encaja en algún sitio, hay juego
      var todas = e.mazo.concat(e.descarte);
      for (var k = 0; k < todas.length; k++) {
        if (cabeEn(e, [todas[k]], { tipo: 'base', i: palo(todas[k]) })) return true;
        for (var c = 0; c < 7; c++) if (cabeEn(e, [todas[k]], { tipo: 'columna', i: c })) return true;
      }
    }
    for (var i = 0; i < 7; i++) {
      var col = e.columnas[i];
      for (var j = 0; j < col.visibles.length; j++) {
        var o = { tipo: 'columna', i: i, k: j };
        var d = mejorDestino(e, o);
        // Mover a otra columna solo cuenta si destapa algo o deja la última carta para la base
        if (d && (d.tipo === 'base' || (j === 0 && col.ocultas.length))) return true;
      }
    }
    return false;
  }

  function valido(e) {
    if (!e || !Array.isArray(e.mazo) || !Array.isArray(e.descarte) || !Array.isArray(e.bases) || e.bases.length !== 4) return false;
    if (!Array.isArray(e.columnas) || e.columnas.length !== 7) return false;
    var todas = e.mazo.concat(e.descarte);
    e.bases.forEach(function (b) { todas = todas.concat(b); });
    e.columnas.forEach(function (c) { todas = todas.concat(c.ocultas || [], c.visibles || []); });
    if (todas.length !== 52) return false;
    var vistas = {};
    return todas.every(function (c) {
      if (c !== (c | 0) || c < 0 || c > 51 || vistas[c]) return false;
      vistas[c] = true;
      return true;
    });
  }

  function nombre(c) { return NOMBRES[valor(c)] + PALOS[palo(c)]; }

  return {
    PALOS: PALOS, NOMBRES: NOMBRES,
    palo: palo, valor: valor, roja: roja, nombre: nombre,
    nuevo: nuevo, robar: robar, cartasDe: cartasDe, cabeEn: cabeEn, puede: puede, mover: mover,
    mejorDestino: mejorDestino, ganada: ganada, resoluble: resoluble, pasoFinal: pasoFinal,
    hayJugadas: hayJugadas, valido: valido
  };
});
