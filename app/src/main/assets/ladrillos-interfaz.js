// Pantalla de Rompeladrillos: canvas, arrastrar la pala, vidas, niveles, récord
// y partida guardada (en pausa) si sales de la pantalla.
(function () {
  'use strict';

  var L = window.Ladrillos;
  var P = window.Plataforma;
  var almacen = P.almacen('ladrillos');
  var partida = P.partida('ladrillos');

  var datos = almacen.leer('v1', null);
  if (!datos || typeof datos !== 'object') datos = {};
  if (typeof datos.record !== 'number') datos.record = 0;

  var e = null, fase = 'inicio'; // inicio, jugando, pausa, fin
  var escala = 1, colores = {}, anterior = 0, cuadro = null, chispas = [], rotulo = null;

  // Cómo se ve cada poder
  var PODER = {
    larga: { letra: 'L', nombre: 'Pala larga', color: '#3d7ae6' },
    laser: { letra: 'D', nombre: '¡Láser!', color: '#ef4b4b' },
    multi: { letra: 'M', nombre: 'Multibola', color: '#a259e0' },
    lenta: { letra: 'F', nombre: 'Bola lenta', color: '#2fa36b' },
    pegajosa: { letra: 'P', nombre: 'Pala pegajosa', color: '#e08a1e' },
    vida: { letra: '♥', nombre: '¡Vida extra!', color: '#e8457a' }
  };

  var el = {
    lienzo: document.getElementById('lienzo'),
    aviso: document.getElementById('aviso'),
    avisoTitulo: document.getElementById('avisoTitulo'),
    avisoTexto: document.getElementById('avisoTexto'),
    avisoBoton: document.getElementById('avisoBoton'),
    puntos: document.getElementById('puntos'),
    nivel: document.getElementById('nivel'),
    record: document.getElementById('record'),
    pausa: document.getElementById('pausa'),
    campo: document.getElementById('campo')
  };
  var ctx = el.lienzo.getContext('2d');

  function leerColores() {
    var cs = getComputedStyle(document.documentElement);
    ['campo', 'pala', 'bola', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'duro'].forEach(function (k) {
      colores[k] = cs.getPropertyValue('--' + k).trim();
    });
  }

  // ---------- Dibujo ----------
  function medir() {
    var main = document.querySelector('main');
    var ancho = Math.min(main.clientWidth - 32, 420);
    var alto = window.innerHeight - 40 - 56 - 30 - 14 * 3 - 30;
    escala = Math.max(0.6, Math.min(ancho / L.ANCHO, alto / L.ALTO));
    var dpr = window.devicePixelRatio || 1;
    el.lienzo.style.width = Math.round(L.ANCHO * escala) + 'px';
    el.lienzo.style.height = Math.round(L.ALTO * escala) + 'px';
    el.aviso.style.width = Math.round(L.ANCHO * escala) + 'px';
    el.lienzo.width = Math.round(L.ANCHO * escala * dpr);
    el.lienzo.height = Math.round(L.ALTO * escala * dpr);
    ctx.setTransform(escala * dpr, 0, 0, escala * dpr, 0, 0);
    dibujar();
  }

  function redondo(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function dibujar() {
    ctx.fillStyle = colores.campo;
    ctx.fillRect(0, 0, L.ANCHO, L.ALTO);
    if (!e) return;
    // Vidas arriba a la izquierda
    ctx.fillStyle = colores.bola;
    for (var v = 0; v < e.vidas; v++) {
      ctx.beginPath();
      ctx.arc(14 + v * 14, 22, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ladrillos
    for (var i = 0; i < e.ladrillos.length; i++) {
      var vida = e.ladrillos[i];
      if (!vida) continue;
      var r = L.rectLadrillo(i), fila = Math.floor(i / L.COLS);
      ctx.fillStyle = vida > 1 ? colores.duro : colores['f' + (fila % 7)];
      redondo(r.x, r.y, r.w, r.h, 3);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(r.x + 3, r.y + 2, r.w - 6, 2.5);
    }
    // Chispas de los ladrillos rotos
    chispas.forEach(function (c) {
      ctx.globalAlpha = Math.max(0, c.vida / 20);
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, 3, 3);
    });
    ctx.globalAlpha = 1;
    // Pala
    var w = L.anchoPala(e);
    // Disparos del láser
    ctx.fillStyle = PODER.laser.color;
    e.disparos.forEach(function (d) { ctx.fillRect(d.x - 1.5, d.y - 7, 3, 9); });
    // Cápsulas que caen: pastilla de color con su letra
    e.capsulas.forEach(function (c) {
      var x = c.x - L.CAPSULA_ANCHO / 2, y = c.y - L.CAPSULA_ALTO / 2;
      ctx.fillStyle = PODER[c.tipo].color;
      redondo(x, y, L.CAPSULA_ANCHO, L.CAPSULA_ALTO, L.CAPSULA_ALTO / 2);
      ctx.fillStyle = '#fff';
      ctx.font = '800 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PODER[c.tipo].letra, c.x, c.y + 0.5);
    });
    // Pala (con cañones si lleva láser y brillo si es pegajosa)
    ctx.fillStyle = colores.pala;
    redondo(e.pala - w / 2, L.PALA_Y, w, L.PALA_ALTO, 5);
    if (e.efectos.laser) {
      ctx.fillStyle = PODER.laser.color;
      ctx.fillRect(e.pala - w / 2 + 2, L.PALA_Y - 4, 4, 6);
      ctx.fillRect(e.pala + w / 2 - 6, L.PALA_Y - 4, 4, 6);
    }
    if (e.efectos.pegajosa) {
      ctx.fillStyle = PODER.pegajosa.color;
      redondo(e.pala - w / 2 + 3, L.PALA_Y, w - 6, 3, 1.5);
    }
    // Bolas
    ctx.fillStyle = colores.bola;
    e.bolas.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, L.RADIO, 0, Math.PI * 2);
      ctx.fill();
    });
    // Poderes activos arriba a la derecha, con el tiempo que les queda
    var px = L.ANCHO - 8;
    Object.keys(e.efectos).forEach(function (k) {
      var resto = Math.min(1, e.efectos[k] / L.DURACION[k]);
      var veces = L.nivelDe(e, k);
      px -= 24;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = PODER[k].color;
      redondo(px, 14, 22, 14, 7);
      ctx.globalAlpha = 1;
      redondo(px, 14, Math.max(7, 22 * resto), 14, 7);
      ctx.fillStyle = '#fff';
      ctx.font = '800 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PODER[k].letra + (veces > 1 ? veces : ''), px + 11, 21.5);
    });
    // Nombre del último poder cogido
    if (rotulo && rotulo.vida > 0) {
      ctx.globalAlpha = Math.min(1, rotulo.vida / 20);
      ctx.fillStyle = PODER[rotulo.tipo].color;
      ctx.font = '800 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PODER[rotulo.tipo].nombre + (rotulo.veces > 1 ? ' x' + rotulo.veces : ''), L.ANCHO / 2, 250 - (60 - rotulo.vida) * 0.4);
      ctx.globalAlpha = 1;
    }
  }

  function pintarPanel() {
    el.puntos.textContent = e ? e.puntos : 0;
    el.nivel.textContent = e ? e.nivel : 1;
    el.record.textContent = datos.record;
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

  // ---------- Bucle ----------
  function bucle(t) {
    cuadro = null;
    if (fase !== 'jugando') return;
    var pasos = anterior ? Math.min(3, (t - anterior) / 16.67) : 1;
    anterior = t;
    var antes = e.ladrillos.slice();
    var s = L.avanzar(e, pasos);
    // Chispas donde se rompió algo
    for (var i = 0; i < antes.length; i++) {
      if (antes[i] && !e.ladrillos[i] && s.indexOf('nivel') < 0) {
        var r = L.rectLadrillo(i);
        for (var k = 0; k < 8; k++) {
          chispas.push({ x: r.x + Math.random() * r.w, y: r.y + Math.random() * r.h, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.3) * 3, vida: 20, color: colores['f' + (Math.floor(i / L.COLS) % 7)] });
        }
      }
    }
    chispas = chispas.filter(function (c) { c.x += c.vx; c.y += c.vy; c.vy += 0.15; return --c.vida > 0; });
    if (rotulo) rotulo.vida -= pasos;
    s.forEach(function (x) {
      if (x.indexOf('capsula:') === 0) {
        rotulo = { tipo: x.slice(8), vida: 60, veces: L.nivelDe(e, x.slice(8)) };
        P.vibrar(40);
      }
    });
    if (s.indexOf('roto') >= 0 || s.indexOf('ladrillo') >= 0) P.vibrar(8);
    if (s.indexOf('nivel') >= 0) {
      P.vibrar(120);
      chispas = [];
      rotulo = null;
      guardarPartida();
      aviso('¡Nivel ' + e.nivel + '!', 'Toca para lanzar la bola', 'Seguir');
      fase = 'pausa';
    } else if (s.indexOf('fin') >= 0) {
      return fin();
    } else if (s.indexOf('vida') >= 0) {
      P.vibrar(80);
      guardarPartida();
    }
    dibujar();
    pintarPanel();
    if (fase === 'jugando') pedirCuadro();
  }
  function pedirCuadro() {
    if (!cuadro) cuadro = requestAnimationFrame(bucle);
  }

  // ---------- Partida ----------
  function guardarPartida() {
    if (e && e.vidas > 0 && (fase === 'jugando' || fase === 'pausa')) {
      var copia = JSON.parse(JSON.stringify(e));
      L.aparcar(copia); // al volver, la bola espera en la pala (los poderes siguen)
      partida.guardar(copia);
    } else {
      partida.borrar();
    }
  }

  function empezar() {
    e = L.nuevo();
    chispas = [];
    jugar();
    guardarPartida();
  }

  function jugar() {
    fase = 'jugando';
    anterior = 0;
    aviso(null);
    pintarPanel();
    dibujar();
    pedirCuadro();
  }

  function pausar() {
    if (fase !== 'jugando') return;
    fase = 'pausa';
    aviso('Pausa', e.puntos + ' puntos · nivel ' + e.nivel, 'Seguir');
    guardarPartida();
    pintarPanel();
  }

  function fin() {
    fase = 'fin';
    var nuevo = e.puntos > datos.record;
    if (nuevo) datos.record = e.puntos;
    almacen.escribir('v1', datos);
    partida.borrar();
    dibujar();
    pintarPanel();
    aviso(nuevo ? '¡Nuevo récord! 🎉' : 'Fin de la partida', e.puntos + ' puntos · nivel ' + e.nivel, 'Otra partida');
    P.vibrar(nuevo ? 220 : 140);
  }

  // ---------- Controles ----------
  el.avisoBoton.addEventListener('click', function () {
    if (fase === 'pausa') jugar(); else empezar();
  });
  el.pausa.addEventListener('click', function () {
    if (fase === 'jugando') pausar(); else if (fase === 'pausa') jugar();
  });

  // Arrastrar mueve la pala; tocar sin arrastrar lanza la bola
  var toque = null;
  el.campo.addEventListener('pointerdown', function (ev) {
    if (fase !== 'jugando' || (ev.target.closest && ev.target.closest('.aviso'))) return;
    toque = { x: ev.clientX, pala: e.pala };
  });
  document.addEventListener('pointermove', function (ev) {
    if (!toque || fase !== 'jugando') return;
    var dx = (ev.clientX - toque.x) / escala;
    // Mueve la pala lo mismo que el dedo (no hace falta tapar la pala con el dedo)
    L.moverPala(e, toque.pala + dx * 1.25);
    if (e.bolas.some(function (b) { return b.pegada; })) dibujar();
  });
  document.addEventListener('pointerup', function () {
    // Al soltar el dedo, si la bola espera en la pala, sale
    if (toque && fase === 'jugando') L.lanzar(e);
    toque = null;
  });
  document.addEventListener('pointercancel', function () { toque = null; });

  document.addEventListener('keydown', function (ev) {
    if (fase !== 'jugando') return;
    if (ev.key === 'ArrowLeft') L.moverPala(e, e.pala - 16);
    else if (ev.key === 'ArrowRight') L.moverPala(e, e.pala + 16);
    else if (ev.key === ' ') { ev.preventDefault(); L.lanzar(e); }
    else if (ev.key === 'p' || ev.key === 'Escape') pausar();
    dibujar();
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
  if (L.valido(L.arreglar(g))) {
    e = g;
    L.aparcar(e);
    fase = 'pausa';
    aviso('Partida a medias', e.puntos + ' puntos · nivel ' + e.nivel, 'Seguir');
  } else {
    partida.borrar();
  }
  medir();
  pintarPanel();
})();
