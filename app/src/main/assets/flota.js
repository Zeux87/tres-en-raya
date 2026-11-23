// Lógica de Hundir la flota (sin interfaz).
// Tablero de 10x10; cada casilla es un número 0..99 = fila * 10 + columna.
// Regla: los barcos no pueden tocarse, ni siquiera en diagonal.
(function (raiz) {
  'use strict';

  var LADO = 10;
  var TOTAL = LADO * LADO;

  var FLOTA = [
    { id: 'portaaviones', nombre: 'Portaaviones', largo: 5 },
    { id: 'acorazado', nombre: 'Acorazado', largo: 4 },
    { id: 'crucero', nombre: 'Crucero', largo: 3 },
    { id: 'submarino', nombre: 'Submarino', largo: 3 },
    { id: 'destructor', nombre: 'Destructor', largo: 2 }
  ];

  var LETRAS = 'ABCDEFGHIJ';

  function fila(c) { return Math.floor(c / LADO); }
  function col(c) { return c % LADO; }
  function nombreCasilla(c) { return LETRAS.charAt(fila(c)) + (col(c) + 1); }

  // Casillas que ocupa un barco desde "origen" hacia la derecha o hacia abajo; null si se sale
  function celdasDe(origen, largo, horizontal) {
    var f = fila(origen), k = col(origen);
    if (horizontal ? k + largo > LADO : f + largo > LADO) return null;
    var r = [];
    for (var i = 0; i < largo; i++) r.push(horizontal ? origen + i : origen + i * LADO);
    return r;
  }

  // Las (hasta 8) casillas de alrededor
  function vecinas(c) {
    var r = [], f = fila(c), k = col(c);
    for (var df = -1; df <= 1; df++) {
      for (var dk = -1; dk <= 1; dk++) {
        if (!df && !dk) continue;
        var nf = f + df, nk = k + dk;
        if (nf >= 0 && nf < LADO && nk >= 0 && nk < LADO) r.push(nf * LADO + nk);
      }
    }
    return r;
  }

  // ¿Se pueden poner estas casillas sin pisar ni tocar a otro barco? (ignora el barco "ignorarId")
  function sePuedeColocar(barcos, celdas, ignorarId) {
    if (!celdas) return false;
    var ocupadas = {};
    for (var i = 0; i < barcos.length; i++) {
      if (barcos[i].id === ignorarId) continue;
      var cs = barcos[i].celdas;
      for (var j = 0; j < cs.length; j++) {
        ocupadas[cs[j]] = true;
        var v = vecinas(cs[j]);
        for (var n = 0; n < v.length; n++) ocupadas[v[n]] = true;
      }
    }
    for (var c = 0; c < celdas.length; c++) if (ocupadas[celdas[c]]) return false;
    return true;
  }

  function barcoNuevo(def, celdas, horizontal) {
    return { id: def.id, nombre: def.nombre, largo: def.largo, celdas: celdas, horizontal: horizontal, tocados: 0 };
  }

  // Coloca toda la flota al azar respetando las reglas
  function flotaAleatoria(azar) {
    azar = azar || Math.random;
    for (var intento = 0; intento < 200; intento++) {
      var barcos = [];
      var ok = true;
      for (var b = 0; b < FLOTA.length && ok; b++) {
        var puesto = false;
        for (var t = 0; t < 500 && !puesto; t++) {
          var h = azar() < 0.5;
          var celdas = celdasDe(Math.floor(azar() * TOTAL), FLOTA[b].largo, h);
          if (sePuedeColocar(barcos, celdas)) {
            barcos.push(barcoNuevo(FLOTA[b], celdas, h));
            puesto = true;
          }
        }
        if (!puesto) ok = false;
      }
      if (ok) return barcos;
    }
    throw new Error('No se pudo colocar la flota');
  }

  function nuevoJugador(nombre) {
    var disparos = [];
    for (var i = 0; i < TOTAL; i++) disparos.push(null);
    return { nombre: nombre, barcos: [], disparos: disparos }; // disparos recibidos: null | 'agua' | 'tocado'
  }

  function flotaCompleta(jugador) {
    return jugador.barcos.length === FLOTA.length;
  }

  function barcoEn(jugador, c) {
    for (var i = 0; i < jugador.barcos.length; i++) {
      if (jugador.barcos[i].celdas.indexOf(c) >= 0) return jugador.barcos[i];
    }
    return null;
  }

  function hundido(barco) { return barco.tocados >= barco.largo; }

  function derrotado(jugador) {
    if (!jugador.barcos.length) return false;
    for (var i = 0; i < jugador.barcos.length; i++) if (!hundido(jugador.barcos[i])) return false;
    return true;
  }

  // Dispara a la casilla c del jugador "objetivo". Modifica su estado y devuelve:
  // { tipo: 'repetido' | 'agua' | 'tocado' | 'hundido', barco, aguaAuto: [casillas], fin }
  function disparar(objetivo, c) {
    if (objetivo.disparos[c]) return { tipo: 'repetido', aguaAuto: [], fin: false };
    var barco = barcoEn(objetivo, c);
    if (!barco) {
      objetivo.disparos[c] = 'agua';
      return { tipo: 'agua', aguaAuto: [], fin: false };
    }
    objetivo.disparos[c] = 'tocado';
    barco.tocados++;
    if (!hundido(barco)) return { tipo: 'tocado', barco: barco, aguaAuto: [], fin: false };

    // Hundido: como los barcos no se tocan, todo lo de alrededor es agua
    var auto = [];
    for (var i = 0; i < barco.celdas.length; i++) {
      var v = vecinas(barco.celdas[i]);
      for (var n = 0; n < v.length; n++) {
        if (!objetivo.disparos[v[n]]) {
          objetivo.disparos[v[n]] = 'agua';
          auto.push(v[n]);
        }
      }
    }
    return { tipo: 'hundido', barco: barco, aguaAuto: auto, fin: derrotado(objetivo) };
  }

  function quedan(jugador) {
    var n = 0;
    for (var i = 0; i < jugador.barcos.length; i++) if (!hundido(jugador.barcos[i])) n++;
    return n;
  }

  var api = {
    LADO: LADO,
    TOTAL: TOTAL,
    FLOTA: FLOTA,
    LETRAS: LETRAS,
    fila: fila,
    col: col,
    nombreCasilla: nombreCasilla,
    celdasDe: celdasDe,
    vecinas: vecinas,
    sePuedeColocar: sePuedeColocar,
    barcoNuevo: barcoNuevo,
    flotaAleatoria: flotaAleatoria,
    nuevoJugador: nuevoJugador,
    flotaCompleta: flotaCompleta,
    barcoEn: barcoEn,
    hundido: hundido,
    derrotado: derrotado,
    disparar: disparar,
    quedan: quedan
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Flota = api;
})(this);
