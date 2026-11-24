// Interfaz de Snake: dibujo en canvas, deslizar/flechas, pausa, récord por nivel
// y partida guardada (en pausa) si sales de la pantalla.
(function () {
  'use strict';

  var S = window.Snake;
  var Pl = window.Plataforma;
  var almacen = Pl.almacen('snake'); // datos en "snake.v1"

  var COLS = 15, FILAS = 17;
  var NIVELES = ['lento', 'normal', 'rapido'];

  var datos = cargar();
  almacen.escribir('enCurso', !!datos.partida); // partida guardada antes de la plantilla
  var e = null;          // estado del juego
  var fase = 'inicio';   // 'inicio', 'jugando', 'pausa', 'fin'
  var reloj = null;
  var colores = {};

  var el = {
    niveles: document.getElementById('niveles'),
    puntos: document.getElementById('puntos'),
    record: document.getElementById('record'),
    pausa: document.getElementById('pausa'),
    lienzo: document.getElementById('lienzo'),
    aviso: document.getElementById('aviso'),
    avisoTitulo: document.getElementById('avisoTitulo'),
    avisoTexto: document.getElementById('avisoTexto'),
    avisoBoton: document.getElementById('avisoBoton'),
    mando: document.getElementById('mando')
  };
  var ctx = el.lienzo.getContext('2d');

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    d = almacen.leer('v1', null);
    if (!d || typeof d !== 'object') d = {};
    if (NIVELES.indexOf(d.nivel) < 0) d.nivel = 'normal';
    if (!d.records || typeof d.records !== 'object') d.records = {};
    if (d.partida && !(S.valido(d.partida.estado) && d.partida.estado.vivo && NIVELES.indexOf(d.partida.nivel) >= 0)) d.partida = null;
    return d;
  }
  function guardar() {
    datos.partida = e && e.vivo && (fase === 'jugando' || fase === 'pausa') ? { nivel: datos.nivel, estado: e } : null;
    almacen.escribir('v1', datos);
    almacen.escribir('enCurso', !!datos.partida); // aviso de "partida a medias" en el menú
  }
  function record() { return datos.records[datos.nivel] || 0; }

  // ---------- Utilidades ----------
  var vibrar = Pl.vibrar;
  function leerColores() {
    var cs = getComputedStyle(document.documentElement);
    ['campo', 'campo2', 'serpiente', 'cabeza', 'comida'].forEach(function (k) {
      colores[k] = cs.getPropertyValue('--' + k).trim();
    });
  }

  // ---------- Dibujo ----------
  function medir() {
    var dpr = window.devicePixelRatio || 1;
    var ancho = el.lienzo.clientWidth || 360;
    var celda = ancho / COLS;
    el.lienzo.style.height = (celda * FILAS) + 'px';
    el.lienzo.width = Math.round(ancho * dpr);
    el.lienzo.height = Math.round(celda * FILAS * dpr);
    dibujar();
  }

  function dibujar() {
    var w = el.lienzo.width, c = w / COLS;
    ctx.fillStyle = colores.campo;
    ctx.fillRect(0, 0, w, el.lienzo.height);
    // Damero suave
    ctx.fillStyle = colores.campo2;
    for (var f = 0; f < FILAS; f++) {
      for (var k = (f % 2); k < COLS; k += 2) ctx.fillRect(k * c, f * c, c, c);
    }
    if (!e) return;
    // Comida
    if (e.comida >= 0) {
      ctx.fillStyle = colores.comida;
      ctx.beginPath();
      ctx.arc((e.comida % COLS + 0.5) * c, (Math.floor(e.comida / COLS) + 0.5) * c, c * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    // Serpiente (de la cola a la cabeza)
    var m = c * 0.1;
    for (var i = e.cuerpo.length - 1; i >= 0; i--) {
      var p = e.cuerpo[i];
      ctx.fillStyle = i === 0 ? colores.cabeza : colores.serpiente;
      redondeado((p % COLS) * c + m, Math.floor(p / COLS) * c + m, c - 2 * m, c * 0.28);
      // Une cada trozo con el siguiente para que parezca continua
      // (no si ha cruzado un borde: entonces están en lados opuestos del campo)
      var q = i > 0 ? e.cuerpo[i - 1] : -1;
      if (i > 0 && Math.abs(p % COLS - q % COLS) + Math.abs(Math.floor(p / COLS) - Math.floor(q / COLS)) === 1) {
        var x = Math.min(p % COLS, q % COLS) * c + m, y = Math.min(Math.floor(p / COLS), Math.floor(q / COLS)) * c + m;
        var horizontal = Math.floor(p / COLS) === Math.floor(q / COLS);
        ctx.fillRect(x + (horizontal ? c / 2 : 0), y + (horizontal ? 0 : c / 2), c - 2 * m, c - 2 * m);
      }
    }
    // Ojos
    var h = e.cuerpo[0], hx = (h % COLS + 0.5) * c, hy = (Math.floor(h / COLS) + 0.5) * c;
    var d = S.MOV[e.dir];
    ctx.fillStyle = '#fff';
    [-1, 1].forEach(function (lado) {
      var ox = d[1] * c * 0.15 + (d[0] ? lado * c * 0.18 : 0);
      var oy = d[0] * c * 0.15 + (d[1] ? lado * c * 0.18 : 0);
      ctx.beginPath();
      ctx.arc(hx + ox, hy + oy, c * 0.09, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function redondeado(x, y, lado, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + lado, y, x + lado, y + lado, r);
    ctx.arcTo(x + lado, y + lado, x, y + lado, r);
    ctx.arcTo(x, y + lado, x, y, r);
    ctx.arcTo(x, y, x + lado, y, r);
    ctx.fill();
  }

  function pintarPanel() {
    el.puntos.textContent = e ? e.puntos : 0;
    el.record.textContent = record();
    var bs = el.niveles.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('activo', bs[i].getAttribute('data-nivel') === datos.nivel);
    el.pausa.textContent = fase === 'jugando' ? '⏸' : '▶';
    el.pausa.disabled = fase !== 'jugando' && fase !== 'pausa';
  }

  function aviso(titulo, texto, boton) {
    if (!titulo) { el.aviso.classList.add('oculto'); return; }
    el.avisoTitulo.textContent = titulo;
    el.avisoTexto.textContent = texto || '';
    el.avisoBoton.textContent = boton;
    el.aviso.classList.remove('oculto');
  }

  // ---------- Juego ----------
  function programar() {
    clearTimeout(reloj);
    reloj = setTimeout(tic, S.velocidad(datos.nivel, e.puntos));
  }

  function tic() {
    if (fase !== 'jugando') return;
    var r = S.paso(e);
    if (r === 'come') {
      vibrar(12);
      if (e.puntos % 5 === 0) guardar();
    }
    dibujar();
    pintarPanel();
    if (r === 'muere' || r === 'gana') return fin(r);
    programar();
  }

  function empezar() {
    e = S.nuevo(COLS, FILAS);
    fase = 'jugando';
    aviso(null);
    dibujar();
    pintarPanel();
    guardar();
    programar();
  }

  function pausar() {
    if (fase !== 'jugando') return;
    fase = 'pausa';
    clearTimeout(reloj);
    aviso('Pausa', 'Llevas ' + e.puntos + ' puntos', 'Seguir');
    guardar();
    pintarPanel();
  }

  function seguir() {
    if (fase !== 'pausa') return;
    fase = 'jugando';
    aviso(null);
    pintarPanel();
    programar();
  }

  function fin(r) {
    fase = 'fin';
    clearTimeout(reloj);
    var nuevo = e.puntos > record();
    if (nuevo) datos.records[datos.nivel] = e.puntos;
    guardar();
    pintarPanel();
    if (r === 'gana') {
      aviso('¡Has llenado el campo! 🏆', e.puntos + ' puntos', 'Otra partida');
      vibrar(300);
    } else {
      aviso(nuevo ? '¡Nuevo récord! 🎉' : 'Fin de la partida', e.puntos + (e.puntos === 1 ? ' punto' : ' puntos'), 'Otra partida');
      vibrar(nuevo ? 220 : 120);
    }
  }

  function girar(d) {
    if (fase === 'pausa') seguir();
    if (fase !== 'jugando') return;
    S.girar(e, d);
  }

  // ---------- Controles ----------
  el.avisoBoton.addEventListener('click', function () {
    if (fase === 'pausa') seguir(); else empezar();
  });
  el.pausa.addEventListener('click', function () {
    if (fase === 'jugando') pausar(); else if (fase === 'pausa') seguir();
  });

  el.mando.addEventListener('pointerdown', function (ev) {
    var b = ev.target.closest ? ev.target.closest('button') : null;
    if (!b) return;
    ev.preventDefault();
    girar(b.getAttribute('data-dir'));
  });

  // Deslizar el dedo en cualquier parte (menos en botones y enlaces)
  var toque = null;
  document.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest && ev.target.closest('button, a')) { toque = null; return; }
    toque = { x: ev.clientX, y: ev.clientY };
  });
  document.addEventListener('pointermove', function (ev) {
    if (!toque) return;
    var dx = ev.clientX - toque.x, dy = ev.clientY - toque.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'abajo' : 'arriba'));
    toque = { x: ev.clientX, y: ev.clientY }; // permite encadenar giros sin levantar el dedo
  });
  ['pointerup', 'pointercancel'].forEach(function (n) {
    document.addEventListener(n, function () { toque = null; });
  });

  document.addEventListener('keydown', function (ev) {
    var teclas = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izq', ArrowRight: 'der' };
    if (teclas[ev.key]) { ev.preventDefault(); girar(teclas[ev.key]); }
    else if (ev.key === ' ') { ev.preventDefault(); if (fase === 'jugando') pausar(); else if (fase === 'pausa') seguir(); }
  });

  el.niveles.addEventListener('click', function (ev) {
    var n = ev.target.getAttribute && ev.target.getAttribute('data-nivel');
    if (!n || n === datos.nivel) return;
    clearTimeout(reloj);
    datos.nivel = n;
    e = null;
    fase = 'inicio';
    guardar();
    dibujar();
    pintarPanel();
    aviso('Snake', 'Velocidad: ' + ev.target.textContent.toLowerCase(), 'Empezar');
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) pausar(); });
  window.addEventListener('pagehide', function () { pausar(); guardar(); });
  window.addEventListener('resize', medir);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var alCambiar = function () { leerColores(); dibujar(); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  }

  // ---------- Arranque ----------
  leerColores();
  if (datos.partida) {
    datos.nivel = datos.partida.nivel;
    e = datos.partida.estado;
    e.cola = [];
    fase = 'pausa';
    aviso('Partida a medias', 'Llevas ' + e.puntos + ' puntos', 'Seguir');
  }
  medir();
  pintarPanel();
})();
