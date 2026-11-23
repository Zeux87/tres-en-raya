// Lógica del Buscaminas: tablero, colocar minas, descubrir casillas y banderas.
// El tablero es un objeto que se puede guardar con JSON:
//   { filas, cols, minas, mina: [bool], abierta: [bool], bandera: [bool], fase, explotada }
// Casilla = fila * cols + columna. Fase: 'nueva' (aún sin minas), 'jugando', 'ganada' o 'perdida'.
// Las minas se colocan en el primer toque, nunca en esa casilla ni a su alrededor.
(function (raiz) {
  'use strict';

  var NIVELES = {
    facil: { filas: 10, cols: 8, minas: 10 },
    normal: { filas: 14, cols: 10, minas: 24 },
    dificil: { filas: 16, cols: 12, minas: 40 }
  };

  function relleno(n, v) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(v);
    return a;
  }

  function nuevo(filas, cols, minas) {
    var total = filas * cols;
    minas = Math.max(1, Math.min(minas, total - 1));
    return {
      filas: filas,
      cols: cols,
      minas: minas,
      mina: relleno(total, false),
      abierta: relleno(total, false),
      bandera: relleno(total, false),
      fase: 'nueva',
      explotada: -1
    };
  }

  function vecinos(t, i) {
    var f = Math.floor(i / t.cols), c = i % t.cols, r = [];
    for (var df = -1; df <= 1; df++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (!df && !dc) continue;
        var ff = f + df, cc = c + dc;
        if (ff >= 0 && ff < t.filas && cc >= 0 && cc < t.cols) r.push(ff * t.cols + cc);
      }
    }
    return r;
  }

  // Minas alrededor de la casilla
  function cuenta(t, i) {
    var v = vecinos(t, i), n = 0;
    for (var k = 0; k < v.length; k++) if (t.mina[v[k]]) n++;
    return n;
  }

  // Pone las minas al azar evitando la primera casilla tocada y, si cabe, su alrededor
  function colocar(t, primera, azar) {
    azar = azar || Math.random;
    var total = t.filas * t.cols;
    var prohibidas = {};
    prohibidas[primera] = true;
    var alrededor = vecinos(t, primera);
    if (total - 1 - alrededor.length >= t.minas) alrededor.forEach(function (v) { prohibidas[v] = true; });
    var libres = [];
    for (var i = 0; i < total; i++) if (!prohibidas[i]) libres.push(i);
    // Fisher-Yates parcial
    for (var k = 0; k < t.minas; k++) {
      var j = k + Math.floor(azar() * (libres.length - k));
      var tmp = libres[k]; libres[k] = libres[j]; libres[j] = tmp;
      t.mina[libres[k]] = true;
    }
    t.fase = 'jugando';
  }

  function cerradasSinMina(t) {
    var n = 0;
    for (var i = 0; i < t.mina.length; i++) if (!t.mina[i] && !t.abierta[i]) n++;
    return n;
  }

  function comprobarVictoria(t) {
    if (t.fase === 'jugando' && cerradasSinMina(t) === 0) {
      t.fase = 'ganada';
      // Se ponen banderas en todas las minas
      for (var i = 0; i < t.mina.length; i++) if (t.mina[i]) t.bandera[i] = true;
    }
  }

  // Abre la casilla (y, si es un 0, todo lo que la rodea). Devuelve las casillas abiertas.
  function descubrir(t, i, azar) {
    if (t.fase === 'ganada' || t.fase === 'perdida') return [];
    if (i < 0 || i >= t.mina.length || t.abierta[i] || t.bandera[i]) return [];
    if (t.fase === 'nueva') colocar(t, i, azar);
    if (t.mina[i]) {
      t.abierta[i] = true;
      t.fase = 'perdida';
      t.explotada = i;
      return [i];
    }
    var abiertas = [], pila = [i];
    while (pila.length) {
      var c = pila.pop();
      if (t.abierta[c] || t.bandera[c] || t.mina[c]) continue;
      t.abierta[c] = true;
      abiertas.push(c);
      if (cuenta(t, c) === 0) {
        var v = vecinos(t, c);
        for (var k = 0; k < v.length; k++) if (!t.abierta[v[k]]) pila.push(v[k]);
      }
    }
    comprobarVictoria(t);
    return abiertas;
  }

  // Tocar un número ya abierto con tantas banderas alrededor como su número abre el resto
  function descubrirAlrededor(t, i) {
    if (t.fase !== 'jugando' || !t.abierta[i]) return [];
    var v = vecinos(t, i), banderas = 0;
    for (var k = 0; k < v.length; k++) if (t.bandera[v[k]]) banderas++;
    var n = cuenta(t, i);
    if (n === 0 || banderas !== n) return [];
    var r = [];
    for (var j = 0; j < v.length && t.fase === 'jugando'; j++) r = r.concat(descubrir(t, v[j]));
    return r;
  }

  function alternarBandera(t, i) {
    if (t.fase === 'ganada' || t.fase === 'perdida' || t.abierta[i]) return false;
    t.bandera[i] = !t.bandera[i];
    return true;
  }

  function banderas(t) {
    var n = 0;
    for (var i = 0; i < t.bandera.length; i++) if (t.bandera[i]) n++;
    return n;
  }

  // Comprueba que un tablero cargado de memoria tiene buena pinta
  function valido(t) {
    if (!t || typeof t !== 'object') return false;
    var total = t.filas * t.cols;
    if (!(total > 0) || !Array.isArray(t.mina) || !Array.isArray(t.abierta) || !Array.isArray(t.bandera)) return false;
    if (t.mina.length !== total || t.abierta.length !== total || t.bandera.length !== total) return false;
    return ['nueva', 'jugando', 'ganada', 'perdida'].indexOf(t.fase) >= 0;
  }

  var api = {
    NIVELES: NIVELES,
    nuevo: nuevo,
    vecinos: vecinos,
    cuenta: cuenta,
    colocar: colocar,
    descubrir: descubrir,
    descubrirAlrededor: descubrirAlrededor,
    alternarBandera: alternarBandera,
    banderas: banderas,
    cerradasSinMina: cerradasSinMina,
    valido: valido
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Buscaminas = api;
})(this);
