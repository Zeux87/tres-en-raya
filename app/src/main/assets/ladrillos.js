// Lógica de Rompeladrillos, sin DOM: la usan la pantalla y las pruebas en Node.
// Campo lógico de 300×420. La pala va abajo; la bola rebota en paredes, pala y ladrillos.
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
  var VIDAS = 3;

  // Dibujos de los niveles: cada letra es una fila de 8. '.' vacío, '1' normal, '2' duro (2 golpes)
  var NIVELES = [
    ['11111111', '11111111', '11111111', '11111111', '11111111'],
    ['.111111.', '11111111', '11222211', '11111111', '.111111.', '..1111..'],
    ['1.1.1.1.', '.1.1.1.1', '22222222', '1.1.1.1.', '.1.1.1.1', '11111111'],
    ['22....22', '11211211', '11111111', '.122221.', '11111111', '22.11.22', '11111111'],
    ['22222222', '21111112', '21222212', '21211212', '21222212', '21111112', '22222222']
  ];

  function anchoPala(nivel) { return Math.max(40, 60 - (nivel - 1) * 3); }
  function rapidez(nivel) { return Math.min(7.2, 4.2 + (nivel - 1) * 0.45); } // unidades por paso de 16 ms

  function cargarNivel(e) {
    var dibujo = NIVELES[(e.nivel - 1) % NIVELES.length];
    e.ladrillos = [];
    dibujo.forEach(function (fila, r) {
      for (var c = 0; c < COLS; c++) {
        var ch = fila.charAt(c);
        e.ladrillos.push(ch === '.' ? 0 : ch === '2' ? 2 : 1);
      }
    });
    e.filas = dibujo.length;
    pegar(e);
  }

  // La bola vuelve a la pala, esperando a que se lance
  function pegar(e) {
    e.bola = { x: e.pala, y: PALA_Y - RADIO - 1, vx: 0, vy: 0, pegada: true };
  }

  function nuevo() {
    var e = { nivel: 1, vidas: VIDAS, puntos: 0, pala: ANCHO / 2 };
    cargarNivel(e);
    return e;
  }

  function lanzar(e, azar) {
    if (!e.bola.pegada) return false;
    azar = azar || Math.random;
    var v = rapidez(e.nivel), ang = (-60 + azar() * 30) * Math.PI / 180 * (azar() < 0.5 ? 1 : -1);
    // Ángulo respecto a la vertical, hacia arriba
    e.bola.vx = v * Math.sin(ang);
    e.bola.vy = -v * Math.cos(ang);
    e.bola.pegada = false;
    return true;
  }

  function moverPala(e, x) {
    var m = anchoPala(e.nivel) / 2;
    e.pala = Math.max(m, Math.min(ANCHO - m, x));
    if (e.bola.pegada) e.bola.x = e.pala;
  }

  function rectLadrillo(i) {
    var r = Math.floor(i / COLS), c = i % COLS;
    return { x: MARGEN + c * (LAD_ANCHO + HUECO), y: ARRIBA + r * (LAD_ALTO + HUECO), w: LAD_ANCHO, h: LAD_ALTO };
  }

  function quedan(e) { return e.ladrillos.filter(Boolean).length; }

  // Avanza "pasos" pasos de 16 ms. Devuelve la lista de sucesos:
  // 'pared', 'pala', 'ladrillo', 'roto', 'vida' (se perdió una), 'fin', 'nivel' (siguiente nivel)
  function avanzar(e, pasos) {
    var sucesos = [];
    if (e.bola.pegada || e.vidas <= 0) return sucesos;
    var total = Math.max(1, Math.ceil(pasos * Math.max(Math.abs(e.bola.vx), Math.abs(e.bola.vy)) / 2.5));
    for (var k = 0; k < total; k++) {
      var b = e.bola;
      b.x += b.vx * pasos / total;
      b.y += b.vy * pasos / total;
      // Paredes
      if (b.x < RADIO) { b.x = RADIO; b.vx = Math.abs(b.vx); sucesos.push('pared'); }
      if (b.x > ANCHO - RADIO) { b.x = ANCHO - RADIO; b.vx = -Math.abs(b.vx); sucesos.push('pared'); }
      if (b.y < RADIO) { b.y = RADIO; b.vy = Math.abs(b.vy); sucesos.push('pared'); }
      // Pala
      var m = anchoPala(e.nivel) / 2;
      if (b.vy > 0 && b.y + RADIO >= PALA_Y && b.y + RADIO <= PALA_Y + PALA_ALTO + 4 && b.x >= e.pala - m - RADIO && b.x <= e.pala + m + RADIO) {
        // El ángulo depende de dónde toca: en el centro sale recta, en los bordes inclinada
        var rel = Math.max(-1, Math.min(1, (b.x - e.pala) / (m + RADIO)));
        var ang = rel * 62 * Math.PI / 180;
        var v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = v * Math.sin(ang);
        b.vy = -v * Math.cos(ang);
        b.y = PALA_Y - RADIO;
        sucesos.push('pala');
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
        e.ladrillos[i]--;
        e.puntos += e.ladrillos[i] ? 5 : 10 * e.nivel;
        sucesos.push(e.ladrillos[i] ? 'ladrillo' : 'roto');
        break; // un ladrillo por paso
      }
      if (!quedan(e)) {
        e.nivel++;
        e.puntos += 100;
        cargarNivel(e);
        sucesos.push('nivel');
        return sucesos;
      }
      // Se escapa por abajo
      if (b.y - RADIO > ALTO) {
        e.vidas--;
        sucesos.push(e.vidas > 0 ? 'vida' : 'fin');
        pegar(e);
        return sucesos;
      }
      // Evita trayectorias casi horizontales que no terminan nunca
      if (Math.abs(b.vy) < 1.2) b.vy = b.vy < 0 ? -1.2 : 1.2;
    }
    return sucesos;
  }

  function valido(e) {
    return !!e && typeof e.nivel === 'number' && e.nivel >= 1 && typeof e.vidas === 'number' && e.vidas > 0 &&
      typeof e.puntos === 'number' && Array.isArray(e.ladrillos) && typeof e.pala === 'number' && !!e.bola;
  }

  return {
    ANCHO: ANCHO, ALTO: ALTO, COLS: COLS, PALA_Y: PALA_Y, PALA_ALTO: PALA_ALTO, RADIO: RADIO, VIDAS: VIDAS, NIVELES: NIVELES,
    nuevo: nuevo, lanzar: lanzar, moverPala: moverPala, avanzar: avanzar, rectLadrillo: rectLadrillo,
    quedan: quedan, anchoPala: anchoPala, rapidez: rapidez, pegar: pegar, valido: valido
  };
});
