// Pantalla de Bloques: dibujo en canvas, gestos y botones, pausa, récord
// y partida guardada (en pausa) si sales de la pantalla.
(function () {
  'use strict';

  var B = window.Bloques;
  var P = window.Plataforma;
  var almacen = P.almacen('bloques');
  var partida = P.partida('bloques');

  var datos = almacen.leer('v1', null);
  if (!datos || typeof datos !== 'object') datos = {};
  if (typeof datos.record !== 'number') datos.record = 0;
  if ([1, 5, 9].indexOf(datos.nivel) < 0) datos.nivel = 1;

  var e = null, fase = 'inicio'; // inicio, jugando, pausa, fin
  var reloj = null, celda = 24, colores = {}, destello = null;

  var el = {
    lienzo: document.getElementById('lienzo'),
    siguiente: document.getElementById('siguiente'),
    aviso: document.getElementById('aviso'),
    avisoTitulo: document.getElementById('avisoTitulo'),
    avisoTexto: document.getElementById('avisoTexto'),
    avisoBoton: document.getElementById('avisoBoton'),
    niveles: document.getElementById('niveles'),
    puntos: document.getElementById('puntos'),
    lineas: document.getElementById('lineas'),
    nivel: document.getElementById('nivel'),
    record: document.getElementById('record'),
    pausa: document.getElementById('pausa'),
    mando: document.getElementById('mando')
  };
  var ctx = el.lienzo.getContext('2d');
  var ctxS = el.siguiente.getContext('2d');

  var niveles = P.segmentos(el.niveles, String(datos.nivel), function (v) {
    datos.nivel = parseInt(v, 10);
    almacen.escribir('v1', datos);
  });

  function leerColores() {
    var cs = getComputedStyle(document.documentElement);
    ['pozo', 'pozo-linea', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].forEach(function (k) {
      colores[k] = cs.getPropertyValue('--' + k).trim();
    });
  }

  // ---------- Medidas y dibujo ----------
  function medir() {
    var main = document.querySelector('main');
    var ancho = Math.min(main.clientWidth - 32, 440) - 96;
    var resto = 40 + 54 + 14 * 2 + 30; // barra, mando, huecos y márgenes
    var alto = window.innerHeight - resto;
    celda = Math.max(12, Math.floor(Math.min(ancho / B.COLS, alto / B.FILAS)));
    var dpr = window.devicePixelRatio || 1;
    el.lienzo.style.width = (celda * B.COLS) + 'px';
    el.lienzo.style.height = (celda * B.FILAS) + 'px';
    el.lienzo.width = Math.round(celda * B.COLS * dpr);
    el.lienzo.height = Math.round(celda * B.FILAS * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    el.siguiente.width = Math.round(64 * dpr);
    el.siguiente.height = Math.round(44 * dpr);
    el.siguiente.style.width = '64px';
    el.siguiente.style.height = '44px';
    ctxS.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar();
  }

  function cuadro(c, x, y, lado, color, alfa) {
    c.globalAlpha = alfa || 1;
    c.fillStyle = color;
    c.beginPath();
    var r = lado * 0.18, m = 1;
    if (c.roundRect) c.roundRect(x + m, y + m, lado - 2 * m, lado - 2 * m, r);
    else c.rect(x + m, y + m, lado - 2 * m, lado - 2 * m);
    c.fill();
    if (!alfa || alfa === 1) {
      c.fillStyle = 'rgba(255,255,255,.22)';
      c.fillRect(x + lado * 0.2, y + lado * 0.16, lado * 0.6, lado * 0.12);
    }
    c.globalAlpha = 1;
  }

  function dibujar() {
    var w = celda * B.COLS, h = celda * B.FILAS;
    ctx.fillStyle = colores.pozo;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = colores['pozo-linea'];
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 1; x < B.COLS; x++) { ctx.moveTo(x * celda + 0.5, 0); ctx.lineTo(x * celda + 0.5, h); }
    for (var y = 1; y < B.FILAS; y++) { ctx.moveTo(0, y * celda + 0.5); ctx.lineTo(w, y * celda + 0.5); }
    ctx.stroke();
    if (!e) return;
    for (var i = 0; i < e.t.length; i++) {
      if (!e.t[i]) continue;
      var fila = Math.floor(i / B.COLS);
      cuadro(ctx, (i % B.COLS) * celda, fila * celda, celda, colores['p' + e.t[i]]);
    }
    if (destello) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      destello.forEach(function (f) { ctx.fillRect(0, f * celda, w, celda); });
    }
    if (fase === 'jugando' || fase === 'pausa') {
      // Sombra de dónde caerá
      var yf = B.fondo(e);
      B.celdas({ tipo: e.pieza.tipo, rot: e.pieza.rot, x: e.pieza.x, y: yf }).forEach(function (c) {
        if (c[1] >= 0) cuadro(ctx, c[0] * celda, c[1] * celda, celda, colores['p' + e.pieza.tipo], 0.22);
      });
      B.celdas(e.pieza).forEach(function (c) {
        if (c[1] >= 0) cuadro(ctx, c[0] * celda, c[1] * celda, celda, colores['p' + e.pieza.tipo]);
      });
    }
    // Siguiente pieza
    ctxS.clearRect(0, 0, 64, 44);
    var cs = B.GIROS[e.siguiente][0], lado = 14;
    var minX = Math.min.apply(null, cs.map(function (c) { return c[0]; })), maxX = Math.max.apply(null, cs.map(function (c) { return c[0]; }));
    var minY = Math.min.apply(null, cs.map(function (c) { return c[1]; })), maxY = Math.max.apply(null, cs.map(function (c) { return c[1]; }));
    var ox = (64 - (maxX - minX + 1) * lado) / 2, oy = (44 - (maxY - minY + 1) * lado) / 2;
    cs.forEach(function (c) { cuadro(ctxS, ox + (c[0] - minX) * lado, oy + (c[1] - minY) * lado, lado, colores['p' + e.siguiente]); });
  }

  function pintarPanel() {
    el.puntos.textContent = e ? e.puntos : 0;
    el.lineas.textContent = e ? e.lineas : 0;
    el.nivel.textContent = e ? e.nivel : datos.nivel;
    el.record.textContent = datos.record;
    el.pausa.textContent = fase === 'jugando' ? '⏸' : '▶';
    el.pausa.disabled = fase !== 'jugando' && fase !== 'pausa';
  }

  function aviso(titulo, texto, boton, conNiveles) {
    if (!titulo) { el.aviso.classList.add('oculto'); return; }
    el.avisoTitulo.textContent = titulo;
    el.avisoTexto.textContent = texto || '';
    el.avisoBoton.textContent = boton;
    el.niveles.classList.toggle('oculto', !conNiveles);
    el.aviso.classList.remove('oculto');
  }

  // ---------- Partida ----------
  function guardarPartida() {
    if (e && !e.fin && (fase === 'jugando' || fase === 'pausa')) partida.guardar(e);
    else partida.borrar();
  }

  function programar() {
    clearTimeout(reloj);
    reloj = setTimeout(tic, B.velocidad(e.nivel));
  }

  function tic() {
    if (fase !== 'jugando') return;
    tras(B.bajar(e));
    if (fase === 'jugando') programar();
  }

  // Después de bajar o soltar: líneas, fin, repintado
  function tras(borradas) {
    if (borradas && borradas.length) {
      P.vibrar(borradas.length >= 4 ? 120 : 30);
      destello = borradas.map(function (f, k) { return f; });
      setTimeout(function () { destello = null; dibujar(); }, 120);
    } else if (borradas) {
      P.vibrar(6);
    }
    if (e.fin) return fin();
    dibujar();
    pintarPanel();
  }

  function empezar() {
    e = B.nuevo(datos.nivel);
    fase = 'jugando';
    aviso(null);
    dibujar();
    pintarPanel();
    guardarPartida();
    programar();
  }

  function pausar() {
    if (fase !== 'jugando') return;
    fase = 'pausa';
    clearTimeout(reloj);
    aviso('Pausa', e.puntos + ' puntos · ' + e.lineas + ' líneas', 'Seguir');
    guardarPartida();
    pintarPanel();
  }

  function seguir() {
    if (fase !== 'pausa') return;
    fase = 'jugando';
    aviso(null);
    pintarPanel();
    programar();
  }

  function fin() {
    fase = 'fin';
    clearTimeout(reloj);
    var nuevo = e.puntos > datos.record;
    if (nuevo) datos.record = e.puntos;
    almacen.escribir('v1', datos);
    partida.borrar();
    dibujar();
    pintarPanel();
    aviso(nuevo ? '¡Nuevo récord! 🎉' : 'Fin de la partida', e.puntos + ' puntos · ' + e.lineas + ' líneas', 'Otra partida', true);
    P.vibrar(nuevo ? 220 : 120);
  }

  function accion(a) {
    if (fase === 'pausa') return seguir();
    if (fase !== 'jugando') return;
    if (a === 'izq') B.mover(e, -1);
    else if (a === 'der') B.mover(e, 1);
    else if (a === 'girar') B.rotar(e, 1);
    else if (a === 'bajar') { tras(B.bajar(e, null, true)); if (fase === 'jugando') programar(); return; }
    else if (a === 'caer') { tras(B.caer(e)); if (fase === 'jugando') programar(); return; }
    dibujar();
  }

  // ---------- Controles ----------
  el.avisoBoton.addEventListener('click', function () { if (fase === 'pausa') seguir(); else empezar(); });
  el.pausa.addEventListener('click', function () { if (fase === 'jugando') pausar(); else seguir(); });

  // Botones: mantener pulsado repite (menos girar y soltar)
  var repetir = null;
  function pararRepetir() { clearTimeout(repetir); repetir = null; }
  el.mando.addEventListener('pointerdown', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b) return;
    ev.preventDefault();
    var a = b.getAttribute('data-accion');
    accion(a);
    if (a === 'izq' || a === 'der' || a === 'bajar') {
      pararRepetir();
      var paso = function (ms) { repetir = setTimeout(function () { accion(a); paso(60); }, ms); };
      paso(220);
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { el.mando.addEventListener(n, pararRepetir); });

  // Gestos en el pozo: tocar gira, arrastrar mueve, deslizar rápido hacia abajo suelta
  var toque = null;
  el.lienzo.addEventListener('pointerdown', function (ev) {
    toque = { x: ev.clientX, y: ev.clientY, t: Date.now(), dx: 0, dy: 0, movido: false };
  });
  el.lienzo.addEventListener('pointermove', function (ev) {
    if (!toque || fase !== 'jugando') return;
    var dx = ev.clientX - toque.x, dy = ev.clientY - toque.y;
    while (dx - toque.dx > celda * 0.9) { B.mover(e, 1); toque.dx += celda; toque.movido = true; }
    while (toque.dx - dx > celda * 0.9) { B.mover(e, -1); toque.dx -= celda; toque.movido = true; }
    while (dy - toque.dy > celda * 1.1 && Math.abs(dy) > Math.abs(dx)) { tras(B.bajar(e, null, true)); toque.dy += celda; toque.movido = true; }
    dibujar();
  });
  el.lienzo.addEventListener('pointerup', function (ev) {
    if (!toque) return;
    var dy = ev.clientY - toque.y, dt = Date.now() - toque.t;
    if (fase === 'jugando') {
      if (dy > celda * 3 && dt < 250) { tras(B.caer(e)); if (fase === 'jugando') programar(); }
      else if (!toque.movido && dt < 300) accion('girar');
    }
    toque = null;
  });
  el.lienzo.addEventListener('pointercancel', function () { toque = null; });

  document.addEventListener('keydown', function (ev) {
    var t = { ArrowLeft: 'izq', ArrowRight: 'der', ArrowUp: 'girar', ArrowDown: 'bajar', ' ': 'caer' }[ev.key];
    if (t) { ev.preventDefault(); accion(t); }
    else if (ev.key === 'p' || ev.key === 'Escape') { if (fase === 'jugando') pausar(); else seguir(); }
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pausar(); });
  window.addEventListener('pagehide', function () { pausar(); guardarPartida(); });
  window.addEventListener('resize', medir);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var alCambiar = function () { leerColores(); dibujar(); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  }

  // ---------- Arranque ----------
  leerColores();
  var g = partida.cargar();
  if (B.valido(g)) {
    e = g;
    fase = 'pausa';
    aviso('Partida a medias', e.puntos + ' puntos · ' + e.lineas + ' líneas', 'Seguir');
  } else {
    partida.borrar();
    aviso('Bloques', '', 'Empezar', true);
    el.avisoTexto.innerHTML = 'Completa filas para borrarlas.<br>Toca para girar, arrastra para mover<br>y desliza hacia abajo para soltar.';
  }
  niveles.poner(String(datos.nivel));
  medir();
  pintarPanel();
})();
