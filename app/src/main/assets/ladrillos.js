// Lógica de Rompeladrillos, sin DOM: la usan la pantalla y las pruebas en Node.
// Campo lógico de 300×420. La pala va abajo; las bolas rebotan en paredes, pala y ladrillos.
//
// Poderes: al romper un ladrillo a veces cae una cápsula. Si la coges con la pala:
//   larga    pala más ancha un rato
//   laser    la pala dispara sola un rato
//   multi    salen dos bolas más
//   lenta    las bolas van más despacio un rato
//   pegajosa la bola se queda pegada a la pala; toca para lanzarla
//   vida     una vida más
// Al perder una vida o pasar de nivel se acaban los poderes.
(function (raiz, crear) {
  var L = crear();
  if (typeof module === 'object' && module.exports) module.exports = L;
  else raiz.Ladrillos = L;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var ANCHO = 300, ALTO = 420;
  var COLS = 8, MARGEN = 10, ARRIBA = 46, LAD_ALTO = 14, HUECO = 3;
  var LAD_ANCHO = (ANCHO - 2 * MARGEN - (COLS - 1) * HUECO) / COLS;
  var PALA_Y = 392, PALA_ALTO = 10, RADIO = 5;
  var VIDAS = 3, MAX_VIDAS = 6, MAX_BOLAS = 9;
  var CAPSULA_ANCHO = 22, CAPSULA_ALTO = 10, CAPSULA_VEL = 1.6;
  var DISPARO_VEL = 7, CADENCIA = 22;   // pasos entre disparos del láser
  var PROB_CAPSULA = 0.2;
  // Duración de cada poder, en pasos de 16 ms
  var DURACION = { larga: 900, laser: 720, lenta: 600, pegajosa: 900 };
  // Probabilidad relativa de cada cápsula
  var PESOS = { larga: 5, laser: 4, multi: 4, lenta: 4, pegajosa: 3, vida: 1 };
  var PODERES = Object.keys(PESOS);
  var LENTA = 0.62;

  // Dibujos de los niveles: cada letra es una fila de 8. '.' vacío, '1' normal, '2' duro (2 golpes)
  var NIVELES = [
    ['11111111', '11111111', '11111111', '11111111', '11111111'],
    ['.111111.', '11111111', '11222211', '11111111', '.111111.', '..1111..'],
    ['1.1.1.1.', '.1.1.1.1', '22222222', '1.1.1.1.', '.1.1.1.1', '11111111'],
    ['22....22', '11211211', '11111111', '.122221.', '11111111', '22.11.22', '11111111'],
    ['22222222', '21111112', '21222212', '21211212', '21222212', '21111112', '22222222']
  ];

  function anchoBase(nivel) { return Math.max(40, 60 - (nivel - 1) * 3); }
  function anchoPala(e) {
    if (typeof e === 'number') return anchoBase(e);
    return Math.round(anchoBase(e.nivel) * (e.efectos && e.efectos.larga ? 1.55 : 1));
  }
  function rapidez(nivel) { return Math.min(7.2, 4.2 + (nivel - 1) * 0.45); } // unidades por paso de 16 ms
  function rapidezActual(e) { return rapidez(e.nivel) * (e.efectos.lenta ? LENTA : 1); }

  function cargarNivel(e) {
    var dibujo = NIVELES[(e.nivel - 1) % NIVELES.length];
    e.ladrillos = [];
    dibujo.forEach(function (fila) {
      for (var c = 0; c < COLS; c++) {
        var ch = fila.charAt(c);
        e.ladrillos.push(ch === '.' ? 0 : ch === '2' ? 2 : 1);
      }
    });
    e.filas = dibujo.length;
    pegar(e);
  }

  // Vuelve a una sola bola esperando en la pala, sin poderes ni cápsulas
  function pegar(e) {
    e.bolas = [{ x: e.pala, y: PALA_Y - RADIO - 1, vx: 0, vy: 0, pegada: true, dx: 0 }];
    e.capsulas = [];
    e.disparos = [];
    e.efectos = {};
    e.recarga = 0;
  }

  // Para guardar o retomar: una sola bola en la pala, sin cápsulas ni disparos (los poderes siguen)
  function aparcar(e) {
    e.bolas = [{ x: e.pala, y: PALA_Y - RADIO - 1, vx: 0, vy: 0, pegada: true, dx: 0 }];
    e.capsulas = [];
    e.disparos = [];
    return e;
  }

  function nuevo() {
    var e = { nivel: 1, vidas: VIDAS, puntos: 0, pala: ANCHO / 2 };
    cargarNivel(e);
    return e;
  }

  // Lanza las bolas pegadas a la pala. Devuelve true si lanzó alguna.
  function lanzar(e, azar) {
    azar = azar || Math.random;
    var alguna = false;
    e.bolas.forEach(function (b) {
      if (!b.pegada) return;
      var v = rapidezActual(e);
      // Si estaba pegada por la pegajosa, sale según dónde toca la pala; si no, un poco al azar
      var ang = b.dx ? Math.max(-1, Math.min(1, b.dx / (anchoPala(e) / 2))) * 55 * Math.PI / 180
        : (-60 + azar() * 30) * Math.PI / 180 * (azar() < 0.5 ? 1 : -1);
      b.vx = v * Math.sin(ang);
      b.vy = -v * Math.cos(ang);
      b.pegada = false;
      b.dx = 0;
      alguna = true;
    });
    return alguna;
  }

  function moverPala(e, x) {
    var m = anchoPala(e) / 2;
    e.pala = Math.max(m, Math.min(ANCHO - m, x));
    e.bolas.forEach(function (b) { if (b.pegada) b.x = e.pala + b.dx; });
  }

  function rectLadrillo(i) {
    var r = Math.floor(i / COLS), c = i % COLS;
    return { x: MARGEN + c * (LAD_ANCHO + HUECO), y: ARRIBA + r * (LAD_ALTO + HUECO), w: LAD_ANCHO, h: LAD_ALTO };
  }

  function quedan(e) { return e.ladrillos.filter(Boolean).length; }

  function elegirPoder(azar) {
    var total = 0, k;
    for (k in PESOS) total += PESOS[k];
    var r = azar() * total;
    for (k in PESOS) { r -= PESOS[k]; if (r < 0) return k; }
    return 'larga';
  }

  // Golpea el ladrillo i. Si se rompe, quizá suelta una cápsula.
  function golpear(e, i, sucesos, azar) {
    e.ladrillos[i]--;
    e.puntos += e.ladrillos[i] ? 5 : 10 * e.nivel;
    sucesos.push(e.ladrillos[i] ? 'ladrillo' : 'roto');
    if (!e.ladrillos[i] && azar() < PROB_CAPSULA) {
      var r = rectLadrillo(i);
      e.capsulas.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, tipo: elegirPoder(azar) });
    }
  }

  // Cambia la rapidez de todas las bolas en marcha, sin cambiar su dirección
  function ajustarRapidez(e) {
    var v = rapidezActual(e);
    e.bolas.forEach(function (b) {
      var a = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (a > 0) { b.vx *= v / a; b.vy *= v / a; }
    });
  }

  // Aplica el poder de una cápsula cogida
  function activar(e, tipo) {
    if (tipo === 'vida') {
      e.vidas = Math.min(MAX_VIDAS, e.vidas + 1);
    } else if (tipo === 'multi') {
      // De cada bola en marcha (o de la primera) salen dos más, abiertas en abanico
      var base = e.bolas.filter(function (b) { return !b.pegada; })[0] || e.bolas[0];
      var v = rapidezActual(e);
      var ang = base.pegada ? 0 : Math.atan2(base.vx, -base.vy);
      [-0.45, 0.45].forEach(function (d) {
        if (e.bolas.length >= MAX_BOLAS) return;
        var a = ang + d;
        var vy = -v * Math.cos(a);
        if (vy > -1.2) vy = -1.2;
        e.bolas.push({ x: base.x, y: Math.min(base.y, PALA_Y - RADIO - 1), vx: v * Math.sin(a), vy: vy, pegada: false, dx: 0 });
      });
    } else {
      var antes = !!e.efectos[tipo];
      e.efectos[tipo] = DURACION[tipo];
      if (tipo === 'lenta' && !antes) ajustarRapidez(e);
      if (tipo === 'larga') moverPala(e, e.pala);
    }
  }

  function pasarTiempo(e, pasos) {
    for (var k in e.efectos) {
      e.efectos[k] -= pasos;
      if (e.efectos[k] <= 0) {
        delete e.efectos[k];
        if (k === 'lenta') ajustarRapidez(e);
        if (k === 'larga') moverPala(e, e.pala);
        if (k === 'pegajosa') lanzar(e);
      }
    }
  }

  // Avanza "pasos" pasos de 16 ms. Devuelve la lista de sucesos:
  // 'pared', 'pala', 'ladrillo', 'roto', 'disparo', 'capsula:<tipo>' (cogida), 'vida' (se perdió una),
  // 'fin', 'nivel' (siguiente nivel)
  function avanzar(e, pasos, azar) {
    azar = azar || Math.random;
    var sucesos = [];
    if (e.vidas <= 0) return sucesos;
    var enMarcha = e.bolas.some(function (b) { return !b.pegada; });
    if (!enMarcha && !e.capsulas.length && !e.disparos.length) return sucesos;
    pasarTiempo(e, pasos);

    // Láser: dispara solo mientras dura, y solo con la bola en juego
    if (e.efectos.laser && enMarcha) {
      e.recarga -= pasos;
      if (e.recarga <= 0) {
        var m = anchoPala(e) / 2 - 4;
        e.disparos.push({ x: e.pala - m, y: PALA_Y - 2 }, { x: e.pala + m, y: PALA_Y - 2 });
        e.recarga = CADENCIA;
        sucesos.push('disparo');
      }
    }
    // Disparos
    e.disparos = e.disparos.filter(function (d) {
      d.y -= DISPARO_VEL * pasos;
      if (d.y < 0) return false;
      for (var i = 0; i < e.ladrillos.length; i++) {
        if (!e.ladrillos[i]) continue;
        var r = rectLadrillo(i);
        if (d.x >= r.x && d.x <= r.x + r.w && d.y >= r.y && d.y <= r.y + r.h + DISPARO_VEL * pasos) {
          golpear(e, i, sucesos, azar);
          return false;
        }
      }
      return true;
    });
    // Cápsulas
    var mitad = anchoPala(e) / 2;
    e.capsulas = e.capsulas.filter(function (c) {
      c.y += CAPSULA_VEL * pasos;
      if (c.y + CAPSULA_ALTO / 2 >= PALA_Y && c.y - CAPSULA_ALTO / 2 <= PALA_Y + PALA_ALTO &&
          c.x + CAPSULA_ANCHO / 2 >= e.pala - mitad && c.x - CAPSULA_ANCHO / 2 <= e.pala + mitad) {
        activar(e, c.tipo);
        sucesos.push('capsula:' + c.tipo);
        return false;
      }
      return c.y < ALTO + CAPSULA_ALTO;
    });

    if (!quedan(e)) return pasarNivel(e, sucesos);

    // Bolas
    var vivas = [];
    for (var n = 0; n < e.bolas.length; n++) {
      var b = e.bolas[n];
      if (b.pegada) { b.x = e.pala + b.dx; vivas.push(b); continue; }
      var perdida = moverBola(e, b, pasos, sucesos, azar);
      if (!quedan(e)) return pasarNivel(e, sucesos);
      if (!perdida) vivas.push(b);
    }
    e.bolas = vivas;
    if (!e.bolas.length) {
      e.vidas--;
      sucesos.push(e.vidas > 0 ? 'vida' : 'fin');
      pegar(e);
    }
    return sucesos;
  }

  function pasarNivel(e, sucesos) {
    e.nivel++;
    e.puntos += 100;
    cargarNivel(e);
    sucesos.push('nivel');
    return sucesos;
  }

  // Mueve una bola. Devuelve true si se ha escapado por abajo.
  function moverBola(e, b, pasos, sucesos, azar) {
    var total = Math.max(1, Math.ceil(pasos * Math.max(Math.abs(b.vx), Math.abs(b.vy)) / 2.5));
    for (var k = 0; k < total; k++) {
      b.x += b.vx * pasos / total;
      b.y += b.vy * pasos / total;
      // Paredes
      if (b.x < RADIO) { b.x = RADIO; b.vx = Math.abs(b.vx); sucesos.push('pared'); }
      if (b.x > ANCHO - RADIO) { b.x = ANCHO - RADIO; b.vx = -Math.abs(b.vx); sucesos.push('pared'); }
      if (b.y < RADIO) { b.y = RADIO; b.vy = Math.abs(b.vy); sucesos.push('pared'); }
      // Pala
      var m = anchoPala(e) / 2;
      if (b.vy > 0 && b.y + RADIO >= PALA_Y && b.y + RADIO <= PALA_Y + PALA_ALTO + 4 && b.x >= e.pala - m - RADIO && b.x <= e.pala + m + RADIO) {
        sucesos.push('pala');
        b.y = PALA_Y - RADIO - 1;
        if (e.efectos.pegajosa) {
          b.pegada = true;
          b.dx = Math.max(-m, Math.min(m, b.x - e.pala));
          b.vx = 0;
          b.vy = 0;
          return false;
        }
        // El ángulo depende de dónde toca: en el centro sale recta, en los bordes inclinada
        var rel = Math.max(-1, Math.min(1, (b.x - e.pala) / (m + RADIO)));
        var ang = rel * 62 * Math.PI / 180;
        var v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = v * Math.sin(ang);
        b.vy = -v * Math.cos(ang);
      }
      // Ladrillos
      for (var i = 0; i < e.ladrillos.length; i++) {
        if (!e.ladrillos[i]) continue;
        var r = rectLadrillo(i);
        var cx = Math.max(r.x, Math.min(b.x, r.x + r.w)), cy = Math.max(r.y, Math.min(b.y, r.y + r.h));
        var dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy > RADIO * RADIO) continue;
        // Rebota por el lado en que menos ha entrado
        var entraX = Math.min(b.x + RADIO - r.x, r.x + r.w - (b.x - RADIO));
        var entraY = Math.min(b.y + RADIO - r.y, r.y + r.h - (b.y - RADIO));
        if (entraX < entraY) b.vx = b.x < r.x + r.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
        else b.vy = b.y < r.y + r.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
        golpear(e, i, sucesos, azar);
        break; // un ladrillo por paso
      }
      if (!quedan(e)) return false;
      if (b.y - RADIO > ALTO) return true;
      // Evita trayectorias casi horizontales que no terminan nunca
      if (Math.abs(b.vy) < 1.2) b.vy = b.vy < 0 ? -1.2 : 1.2;
    }
    return false;
  }

  // Corrige una partida guardada (también las de antes de los poderes, con "bola" en vez de "bolas")
  function arreglar(e) {
    if (!e || typeof e !== 'object') return null;
    if (!Array.isArray(e.bolas)) e.bolas = e.bola ? [e.bola] : [];
    delete e.bola;
    if (!Array.isArray(e.capsulas)) e.capsulas = [];
    if (!Array.isArray(e.disparos)) e.disparos = [];
    if (!e.efectos || typeof e.efectos !== 'object') e.efectos = {};
    if (typeof e.recarga !== 'number') e.recarga = 0;
    return e;
  }

  function valido(e) {
    return !!e && typeof e.nivel === 'number' && e.nivel >= 1 && typeof e.vidas === 'number' && e.vidas > 0 &&
      typeof e.puntos === 'number' && Array.isArray(e.ladrillos) && typeof e.pala === 'number' &&
      Array.isArray(e.bolas) && e.bolas.length > 0 && Array.isArray(e.capsulas) && !!e.efectos;
  }

  return {
    ANCHO: ANCHO, ALTO: ALTO, COLS: COLS, PALA_Y: PALA_Y, PALA_ALTO: PALA_ALTO, RADIO: RADIO, VIDAS: VIDAS,
    MAX_VIDAS: MAX_VIDAS, MAX_BOLAS: MAX_BOLAS, NIVELES: NIVELES, PODERES: PODERES, DURACION: DURACION,
    CAPSULA_ANCHO: CAPSULA_ANCHO, CAPSULA_ALTO: CAPSULA_ALTO, LENTA: LENTA,
    nuevo: nuevo, lanzar: lanzar, moverPala: moverPala, avanzar: avanzar, rectLadrillo: rectLadrillo,
    quedan: quedan, anchoPala: anchoPala, rapidez: rapidez, rapidezActual: rapidezActual, pegar: pegar, aparcar: aparcar,
    activar: activar, arreglar: arreglar, valido: valido
  };
});
