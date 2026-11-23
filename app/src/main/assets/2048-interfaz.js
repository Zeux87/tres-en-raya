// Interfaz de 2048: deslizar para mover, puntos, récord, deshacer un movimiento
// y partida guardada en cada jugada.
(function () {
  'use strict';

  var J = window.Juego2048;
  var Android = window.Android;

  var CLAVE = '2048.v1';

  var datos = cargar();
  var celdas = [];

  var el = {
    tablero: document.getElementById('tablero'),
    puntos: document.getElementById('puntos'),
    suma: document.getElementById('suma'),
    record: document.getElementById('record'),
    aviso: document.getElementById('aviso'),
    avisoTitulo: document.getElementById('avisoTitulo'),
    avisoTexto: document.getElementById('avisoTexto'),
    avisoSeguir: document.getElementById('avisoSeguir'),
    avisoNueva: document.getElementById('avisoNueva'),
    deshacer: document.getElementById('deshacer')
  };

  // ---------- Persistencia ----------
  // datos = { tablero, puntos, record, ganado (ya se avisó de 2048), anterior: {tablero, puntos} }
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (typeof d.record !== 'number') d.record = 0;
    if (!J.valido(d.tablero)) { d.tablero = null; d.anterior = null; }
    if (typeof d.puntos !== 'number') d.puntos = 0;
    if (d.anterior && !J.valido(d.anterior.tablero)) d.anterior = null;
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  function vibrar(ms) {
    try {
      if (Android && Android.vibrar) Android.vibrar(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }
  function animar(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.offsetWidth;
    nodo.classList.add(clase);
  }

  // ---------- Pintado ----------
  function crearTablero() {
    el.tablero.innerHTML = '';
    celdas = [];
    for (var i = 0; i < J.TOTAL; i++) {
      var c = document.createElement('div');
      c.className = 'celda';
      el.tablero.appendChild(c);
      celdas.push(c);
    }
  }

  function pintar(nueva, fusiones) {
    var t = datos.tablero;
    for (var i = 0; i < J.TOTAL; i++) {
      var v = t[i], cls = 'celda';
      if (v) {
        cls += v <= 2048 ? ' v' + v : ' vmas';
        var cifras = String(v).length;
        if (cifras >= 3) cls += ' d' + Math.min(cifras, 5);
      }
      if (i === nueva) cls += ' aparece';
      if (fusiones && fusiones.indexOf(i) >= 0) cls += ' junta';
      // Se reasigna la clase para que la animación vuelva a empezar
      celdas[i].className = 'celda';
      void celdas[i].offsetWidth;
      celdas[i].className = cls;
      celdas[i].textContent = v ? String(v) : '';
    }
    el.puntos.textContent = datos.puntos;
    el.record.textContent = datos.record;
    el.deshacer.disabled = !datos.anterior;
  }

  function aviso(titulo, texto, seguir) {
    if (!titulo) { el.aviso.classList.add('oculto'); return; }
    el.avisoTitulo.textContent = titulo;
    el.avisoTexto.textContent = texto;
    el.avisoSeguir.classList.toggle('oculto', !seguir);
    el.aviso.classList.remove('oculto');
  }

  // ---------- Juego ----------
  function nuevaPartida() {
    datos.tablero = J.nuevo();
    datos.puntos = 0;
    datos.ganado = false;
    datos.anterior = null;
    guardar();
    aviso(null);
    pintar();
  }

  function enAviso() { return !el.aviso.classList.contains('oculto'); }

  function mover(dir) {
    if (enAviso()) return;
    var r = J.mover(datos.tablero, dir);
    if (!r.movido) { vibrar(15); return; }
    datos.anterior = { tablero: datos.tablero, puntos: datos.puntos, ganado: datos.ganado };
    datos.tablero = r.tablero;
    datos.puntos += r.puntos;
    if (datos.puntos > datos.record) datos.record = datos.puntos;
    var nueva = J.anadir(datos.tablero);
    if (r.puntos) {
      el.suma.textContent = '+' + r.puntos;
      animar(el.suma, 'ver');
      vibrar(12);
    }
    pintar(nueva, r.fusiones);

    if (!datos.ganado && J.maximo(datos.tablero) >= J.META) {
      datos.ganado = true;
      aviso('¡2048! 🎉', 'Lo has conseguido con ' + datos.puntos + ' puntos', true);
      vibrar(250);
    } else if (!J.puedeMover(datos.tablero)) {
      var record = datos.puntos >= datos.record && datos.puntos > 0;
      aviso(record ? '¡Nuevo récord! 🎉' : 'No quedan movimientos', datos.puntos + ' puntos · ficha más alta: ' + J.maximo(datos.tablero), false);
      vibrar(120);
    }
    guardar();
  }

  function deshacer() {
    if (!datos.anterior) return;
    datos.tablero = datos.anterior.tablero;
    datos.puntos = datos.anterior.puntos;
    datos.ganado = datos.anterior.ganado;
    datos.anterior = null;
    aviso(null);
    guardar();
    pintar();
  }

  // ---------- Controles ----------
  var toque = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('button, a')) { toque = null; return; }
    toque = { x: e.clientX, y: e.clientY };
  });
  document.addEventListener('pointermove', function (e) {
    if (!toque) return;
    var dx = e.clientX - toque.x, dy = e.clientY - toque.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    toque = null; // un movimiento por deslizamiento
    mover(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'der' : 'izq') : (dy > 0 ? 'abajo' : 'arriba'));
  });
  ['pointerup', 'pointercancel'].forEach(function (n) {
    document.addEventListener(n, function () { toque = null; });
  });
  document.addEventListener('keydown', function (e) {
    var teclas = { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izq', ArrowRight: 'der' };
    if (teclas[e.key]) { e.preventDefault(); mover(teclas[e.key]); }
  });

  document.getElementById('nueva').addEventListener('click', nuevaPartida);
  el.avisoNueva.addEventListener('click', nuevaPartida);
  el.avisoSeguir.addEventListener('click', function () { aviso(null); });
  el.deshacer.addEventListener('click', deshacer);

  // ---------- Arranque ----------
  crearTablero();
  if (datos.tablero) {
    pintar();
    if (!J.puedeMover(datos.tablero)) aviso('No quedan movimientos', datos.puntos + ' puntos', false);
  } else {
    nuevaPartida();
  }
})();
