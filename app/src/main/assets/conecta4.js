// Lógica de Conecta 4: tablero, ganador e inteligencia del móvil.
// Tablero de 7 columnas x 6 filas en un array de 42 casillas ('R', 'A' o null).
// Casilla = fila * 7 + columna; la fila 0 es la de arriba y la 5 la de abajo.
// 'R' = fichas rojas, 'A' = fichas amarillas.
(function (raiz) {
  'use strict';

  var COLS = 7;
  var FILAS = 6;
  var TOTAL = COLS * FILAS;
  var ORDEN = [3, 2, 4, 1, 5, 0, 6]; // se prueban primero las columnas centrales
  var GANA = 1000000;

  // Todas las líneas de 4 posibles (69)
  var LINEAS = (function () {
    var r = [];
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var f = 0; f < FILAS; f++) {
      for (var c = 0; c < COLS; c++) {
        for (var d = 0; d < dirs.length; d++) {
          var ff = f + dirs[d][0] * 3, cc = c + dirs[d][1] * 3;
          if (ff < 0 || ff >= FILAS || cc < 0 || cc >= COLS) continue;
          var l = [];
          for (var k = 0; k < 4; k++) l.push((f + dirs[d][0] * k) * COLS + c + dirs[d][1] * k);
          r.push(l);
        }
      }
    }
    return r;
  })();

  // Líneas en las que participa cada casilla (para comprobar rápido tras una jugada)
  var LINEAS_DE = (function () {
    var r = [];
    for (var i = 0; i < TOTAL; i++) r.push([]);
    LINEAS.forEach(function (l) { l.forEach(function (c) { r[c].push(l); }); });
    return r;
  })();

  function rival(f) { return f === 'R' ? 'A' : 'R'; }

  function nuevo() {
    var t = [];
    for (var i = 0; i < TOTAL; i++) t.push(null);
    return t;
  }

  // Fila donde caería una ficha en esa columna, o -1 si está llena
  function filaLibre(t, col) {
    for (var f = FILAS - 1; f >= 0; f--) if (!t[f * COLS + col]) return f;
    return -1;
  }

  function columnasLibres(t) {
    var r = [];
    for (var i = 0; i < ORDEN.length; i++) if (!t[ORDEN[i]]) r.push(ORDEN[i]);
    return r;
  }

  // Suelta la ficha; devuelve la casilla donde cae o -1
  function soltar(t, col, ficha) {
    var f = filaLibre(t, col);
    if (f < 0) return -1;
    var c = f * COLS + col;
    t[c] = ficha;
    return c;
  }

  // ¿La ficha puesta en la casilla c ha hecho 4 en línea? Devuelve la línea o null
  function lineaDesde(t, c) {
    var ficha = t[c];
    if (!ficha) return null;
    var ls = LINEAS_DE[c];
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i];
      if (t[l[0]] === ficha && t[l[1]] === ficha && t[l[2]] === ficha && t[l[3]] === ficha) return l;
    }
    return null;
  }

  // {ficha, linea} si alguien ha ganado, 'empate' si el tablero está lleno, o null
  function resultado(t) {
    for (var i = 0; i < LINEAS.length; i++) {
      var l = LINEAS[i];
      var f = t[l[0]];
      if (f && t[l[1]] === f && t[l[2]] === f && t[l[3]] === f) return { ficha: f, linea: l.slice() };
    }
    for (var c = 0; c < COLS; c++) if (!t[c]) return null;
    return 'empate';
  }

  // Columna que gana ya para "ficha", o -1
  function columnaGanadora(t, ficha) {
    var libres = columnasLibres(t);
    for (var i = 0; i < libres.length; i++) {
      var c = soltar(t, libres[i], ficha);
      var gana = !!lineaDesde(t, c);
      t[c] = null;
      if (gana) return libres[i];
    }
    return -1;
  }

  // Puntuación de la posición para "yo" (heurística)
  function evaluar(t, yo) {
    var otro = rival(yo);
    var p = 0;
    // Las fichas en la columna central valen más
    for (var f = 0; f < FILAS; f++) {
      var cc = t[f * COLS + 3];
      if (cc === yo) p += 4; else if (cc === otro) p -= 4;
    }
    for (var i = 0; i < LINEAS.length; i++) {
      var l = LINEAS[i], mias = 0, suyas = 0;
      for (var k = 0; k < 4; k++) {
        var v = t[l[k]];
        if (v === yo) mias++; else if (v === otro) suyas++;
      }
      if (mias && suyas) continue;
      if (mias === 3) p += 50; else if (mias === 2) p += 6; else if (mias === 1) p += 1;
      if (suyas === 3) p -= 60; else if (suyas === 2) p -= 6; else if (suyas === 1) p -= 1;
    }
    return p;
  }

  function SinTiempo() {}

  // Negamax con poda alfa-beta. Devuelve la puntuación para "turno".
  function negamax(t, turno, prof, alfa, beta, ctx) {
    ctx.nodos++;
    if ((ctx.nodos & 1023) === 0 && Date.now() > ctx.limite) throw new SinTiempo();

    var libres = columnasLibres(t);
    if (!libres.length) return 0;

    // Si puedo ganar ya, gano (cuanto antes, mejor)
    for (var i = 0; i < libres.length; i++) {
      var c = soltar(t, libres[i], turno);
      var gana = !!lineaDesde(t, c);
      t[c] = null;
      if (gana) return GANA + prof;
    }
    if (prof === 0) return evaluar(t, turno);

    var mejor = -Infinity;
    for (var j = 0; j < libres.length; j++) {
      var cj = soltar(t, libres[j], turno);
      var v = -negamax(t, rival(turno), prof - 1, -beta, -alfa, ctx);
      t[cj] = null;
      if (v > mejor) mejor = v;
      if (v > alfa) alfa = v;
      if (alfa >= beta) break;
    }
    return mejor;
  }

  // Puntúa cada columna a una profundidad dada. Devuelve [{col, valor}]
  function puntuarColumnas(t, yo, prof, ctx) {
    var libres = columnasLibres(t);
    var r = [];
    for (var i = 0; i < libres.length; i++) {
      var c = soltar(t, libres[i], yo);
      var v = lineaDesde(t, c) ? GANA + prof + 1 : -negamax(t, rival(yo), prof - 1, -Infinity, Infinity, ctx);
      t[c] = null;
      r.push({ col: libres[i], valor: v });
    }
    return r;
  }

  // Búsqueda que va profundizando hasta agotar el tiempo; devuelve las columnas mejor puntuadas
  function buscar(t, yo, profMax, ms) {
    var ctx = { nodos: 0, limite: Date.now() + ms };
    var mejores = null;
    var prof = 1;
    for (; prof <= profMax; prof++) {
      var r;
      try {
        r = puntuarColumnas(t.slice(), yo, prof, ctx);
      } catch (e) {
        if (e instanceof SinTiempo) break;
        throw e;
      }
      mejores = r;
      var maximo = Math.max.apply(null, r.map(function (x) { return x.valor; }));
      if (maximo >= GANA) break; // victoria asegurada, no hace falta buscar más
    }
    return { columnas: mejores, profundidad: prof - 1, nodos: ctx.nodos };
  }

  function alAzar(lista, azar) { return lista[Math.floor(azar() * lista.length)]; }

  // Elige columna para el móvil: 'facil', 'normal' o 'dificil'
  function jugadaMovil(t, yo, dificultad, azar, opciones) {
    azar = azar || Math.random;
    opciones = opciones || {};
    var copia = t.slice();
    var libres = columnasLibres(copia);
    if (!libres.length) return -1;

    var gana = columnaGanadora(copia, yo);
    var tapa = columnaGanadora(copia, rival(yo));

    if (dificultad === 'facil') {
      if (gana >= 0 && azar() < 0.7) return gana;
      if (tapa >= 0 && azar() < 0.4) return tapa;
      // Al azar, con algo de preferencia por el centro
      var pesos = libres.map(function (c) { return 4 - Math.abs(3 - c); });
      var suma = pesos.reduce(function (a, b) { return a + b; }, 0);
      var x = azar() * suma;
      for (var i = 0; i < libres.length; i++) {
        x -= pesos[i];
        if (x < 0) return libres[i];
      }
      return libres[libres.length - 1];
    }

    if (gana >= 0) return gana;
    if (tapa >= 0) return tapa;

    var profMax = dificultad === 'normal' ? 3 : (opciones.profundidad || 12);
    var ms = dificultad === 'normal' ? 300 : (opciones.ms || 900);
    var b = buscar(copia, yo, profMax, ms);
    if (!b.columnas) return alAzar(libres, azar);

    var maximo = Math.max.apply(null, b.columnas.map(function (x) { return x.valor; }));
    // En normal se acepta alguna jugada algo peor para que se pueda ganar
    var margen = dificultad === 'normal' ? 12 : 0;
    var buenas = b.columnas.filter(function (x) { return x.valor >= maximo - margen; })
      .map(function (x) { return x.col; });
    if (dificultad === 'normal' && azar() < 0.15) return alAzar(libres, azar);
    return alAzar(buenas, azar);
  }

  var api = {
    COLS: COLS,
    FILAS: FILAS,
    TOTAL: TOTAL,
    LINEAS: LINEAS,
    rival: rival,
    nuevo: nuevo,
    filaLibre: filaLibre,
    columnasLibres: columnasLibres,
    soltar: soltar,
    lineaDesde: lineaDesde,
    resultado: resultado,
    columnaGanadora: columnaGanadora,
    evaluar: evaluar,
    buscar: buscar,
    jugadaMovil: jugadaMovil
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Conecta4 = api;
})(this);
