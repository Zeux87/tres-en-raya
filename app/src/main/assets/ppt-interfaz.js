// Interfaz de Piedra, papel o tijera: elegir jugada, animación, marcador y rachas.
(function () {
  'use strict';

  var P = window.PPT;
  var Android = window.Android;

  var CLAVE = 'ppt.v1';
  var MANOS = { piedra: '✊', papel: '✋', tijera: '✌️' };
  var NOMBRES = { piedra: 'piedra', papel: 'papel', tijera: 'tijera' };
  var AYUDA = {
    facil: 'El móvil saca lo que le sale, sin pensar.',
    listo: 'El móvil se fija en lo que sueles sacar e intenta adelantarse.'
  };

  var datos = cargar();
  var ocupado = false;

  var el = {
    niveles: document.getElementById('niveles'),
    ayuda: document.getElementById('ayuda'),
    arena: document.getElementById('arena'),
    manoT: document.getElementById('manoT'),
    manoM: document.getElementById('manoM'),
    estado: document.getElementById('estado'),
    racha: document.getElementById('racha'),
    opciones: document.getElementById('opciones'),
    puntosT: document.getElementById('puntosT'),
    puntosE: document.getElementById('puntosE'),
    puntosM: document.getElementById('puntosM'),
    casT: document.getElementById('casT'),
    casE: document.getElementById('casE'),
    casM: document.getElementById('casM')
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (d.nivel !== 'facil' && d.nivel !== 'listo') d.nivel = 'listo';
    if (!d.marcadores || typeof d.marcadores !== 'object') d.marcadores = {};
    if (!Array.isArray(d.historial)) d.historial = [];
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }
  function marcador() {
    var m = datos.marcadores[datos.nivel];
    if (!m || typeof m !== 'object') m = datos.marcadores[datos.nivel] = {};
    ['T', 'E', 'M', 'racha', 'mejor'].forEach(function (k) { if (typeof m[k] !== 'number') m[k] = 0; });
    return m;
  }

  // ---------- Utilidades ----------
  function vibrar(ms) {
    try {
      if (Android && Android.vibrar) Android.vibrar(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }
  function saltar(nodo) {
    nodo.classList.remove('salto');
    void nodo.offsetWidth;
    nodo.classList.add('salto');
  }

  // ---------- Pintado ----------
  function pintar() {
    var bs = el.niveles.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('activo', bs[i].getAttribute('data-nivel') === datos.nivel);
    el.ayuda.textContent = AYUDA[datos.nivel];
    var m = marcador();
    el.puntosT.textContent = m.T;
    el.puntosE.textContent = m.E;
    el.puntosM.textContent = m.M;
    var txt = '';
    if (m.racha >= 2) txt = 'Racha: ' + m.racha + ' victorias seguidas';
    if (m.mejor >= 2) txt += (txt ? ' · ' : '') + 'Mejor racha: ' + m.mejor;
    el.racha.textContent = txt;
  }

  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }

  function bloquear(si) {
    ocupado = si;
    var bs = el.opciones.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].disabled = si;
  }

  // ---------- Juego ----------
  function jugar(mia) {
    if (ocupado || !P.valida(mia)) return;
    bloquear(true);
    // El móvil decide ANTES de ver tu jugada, solo con tu historial
    var suya = P.jugadaMovil(datos.historial, datos.nivel);
    datos.historial = P.anotar(datos.historial, mia);

    el.manoT.className = 'mano';
    el.manoM.className = 'mano';
    el.manoT.textContent = MANOS.piedra;
    el.manoM.textContent = MANOS.piedra;
    ponerEstado('Piedra, papel o tijera…');
    el.arena.classList.remove('agitar');
    void el.arena.offsetWidth;
    el.arena.classList.add('agitar');
    vibrar(10);

    setTimeout(function () {
      el.arena.classList.remove('agitar');
      el.manoT.textContent = MANOS[mia];
      el.manoM.textContent = MANOS[suya];
      var r = P.resultado(mia, suya);
      var m = marcador();
      if (r === 'gana') {
        m.T++;
        m.racha++;
        if (m.racha > m.mejor) m.mejor = m.racha;
        el.manoT.classList.add('gana');
        el.manoM.classList.add('pierde');
        ponerEstado('¡Ganas! ' + cap(NOMBRES[mia]) + ' gana a ' + NOMBRES[suya], 'gana');
        saltar(el.casT);
        vibrar(120);
      } else if (r === 'pierde') {
        m.M++;
        m.racha = 0;
        el.manoM.classList.add('gana');
        el.manoT.classList.add('pierde');
        ponerEstado('Pierdes: ' + NOMBRES[suya] + ' gana a ' + NOMBRES[mia], 'pierde');
        saltar(el.casM);
        vibrar(60);
      } else {
        m.E++;
        ponerEstado('Empate: los dos sacáis ' + NOMBRES[mia]);
        saltar(el.casE);
        vibrar(30);
      }
      guardar();
      pintar();
      bloquear(false);
    }, 650);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Controles ----------
  el.opciones.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b) jugar(b.getAttribute('data-jugada'));
  });

  el.niveles.addEventListener('click', function (e) {
    var n = e.target.getAttribute && e.target.getAttribute('data-nivel');
    if (!n || n === datos.nivel || ocupado) return;
    datos.nivel = n;
    guardar();
    ponerEstado('Elige tu jugada');
    pintar();
  });

  document.getElementById('borrar').addEventListener('click', function () {
    if (ocupado) return;
    datos.marcadores[datos.nivel] = {};
    guardar();
    pintar();
  });

  pintar();
})();
