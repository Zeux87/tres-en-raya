// Interfaz de Piedra, papel o tijera: elegir jugada, animación, marcador y rachas.
(function () {
  'use strict';

  var P = window.PPT;
  var Pl = window.Plataforma;
  var almacen = Pl.almacen('ppt'); // datos en "ppt.v1"

  var MANOS = { piedra: '✊', papel: '✋', tijera: '✌️' };
  var NOMBRES = { piedra: 'piedra', papel: 'papel', tijera: 'tijera' };
  var AYUDA = {
    facil: 'El móvil saca lo que le sale, sin pensar.',
    listo: 'El móvil se fija en lo que sueles sacar e intenta adelantarse.',
    cerca: 'Cada uno elige en su móvil y se enseñan a la vez.'
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
    quienM: document.getElementById('quienM')
  };

  var mc = Pl.marcador(document.getElementById('marcador'), [
    { id: 'T', nombre: 'Tú', color: 'var(--tu)' },
    { id: 'E', nombre: 'Empates' },
    { id: 'M', nombre: 'Móvil', color: 'var(--movil)' }
  ]);

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    d = almacen.leer('v1', null);
    if (!d || typeof d !== 'object') d = {};
    if (d.nivel !== 'facil' && d.nivel !== 'listo') d.nivel = 'listo';
    if (!d.marcadores || typeof d.marcadores !== 'object') d.marcadores = {};
    if (!Array.isArray(d.historial)) d.historial = [];
    return d;
  }
  function guardar() {
    almacen.escribir('v1', datos);
  }
  function marcador() {
    if (red) return red.marcador; // con otro móvil: marcador solo de esta conexión
    var m = datos.marcadores[datos.nivel];
    if (!m || typeof m !== 'object') m = datos.marcadores[datos.nivel] = {};
    ['T', 'E', 'M', 'racha', 'mejor'].forEach(function (k) { if (typeof m[k] !== 'number') m[k] = 0; });
    return m;
  }

  // ---------- Utilidades ----------
  var vibrar = Pl.vibrar;

  // ---------- Pintado ----------
  function pintar() {
    var bs = el.niveles.querySelectorAll('button');
    var nivel = sala ? 'cerca' : datos.nivel;
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('activo', bs[i].getAttribute('data-nivel') === nivel);
    el.ayuda.textContent = AYUDA[nivel];
    var rival = red ? red.rival : 'Móvil';
    el.quienM.textContent = rival;
    mc.nombres({ M: rival });
    var m = marcador();
    mc.pintar(m);
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
    if (red) return jugarRed(mia);
    bloquear(true);
    // El móvil decide ANTES de ver tu jugada, solo con tu historial
    var suya = P.jugadaMovil(datos.historial, datos.nivel);
    datos.historial = P.anotar(datos.historial, mia);
    mostrar(mia, suya);
  }

  // Enseña las dos manos con la animación y apunta el resultado
  function mostrar(mia, suya, despues) {
    bloquear(true);
    var quien = red ? red.rival : 'el móvil';

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
        mc.saltar('T');
        vibrar(120);
      } else if (r === 'pierde') {
        m.M++;
        m.racha = 0;
        el.manoM.classList.add('gana');
        el.manoT.classList.add('pierde');
        ponerEstado('Pierdes: ' + NOMBRES[suya] + (red ? ' de ' + quien : '') + ' gana a ' + NOMBRES[mia], 'pierde');
        mc.saltar('M');
        vibrar(60);
      } else {
        m.E++;
        ponerEstado('Empate: los dos sacáis ' + NOMBRES[mia]);
        mc.saltar('E');
        vibrar(30);
      }
      if (!red) guardar();
      pintar();
      bloquear(false);
      if (despues) despues();
    }, 650);
  }

  // ---------- Contra otro móvil cercano (cerca.js) ----------
  // Cada uno elige en su móvil; cuando los dos han elegido, se enseñan a la vez.
  // Mensaje: { t: 'jugada', ronda, j }
  var sala = null, red = null;

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'ppt',
      alConectar: function (info) {
        red = { rival: info.rival, marcador: { T: 0, E: 0, M: 0, racha: 0, mejor: 0 }, ronda: 1, mia: null, suya: null };
        ponerEstado('Elige tu jugada');
        pintar();
      },
      alMensaje: function (m) {
        if (!red || !m || m.t !== 'jugada' || !P.valida(m.j) || m.ronda !== red.ronda || red.suya) return;
        red.suya = m.j;
        if (red.mia) resolverRed();
        else ponerEstado(red.rival + ' ya ha elegido. ¡Te toca!');
      },
      alCerrar: function () {
        sala = null;
        red = null;
        ponerEstado('Elige tu jugada');
        bloquear(false);
        pintar();
      }
    });
    pintar();
  }

  function salirCerca() {
    if (sala) sala.cerrar();
    sala = null;
    red = null;
  }

  function jugarRed(mia) {
    if (red.mia) return;
    red.mia = mia;
    sala.enviar({ t: 'jugada', ronda: red.ronda, j: mia });
    var bs = el.opciones.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('elegida', bs[i].getAttribute('data-jugada') === mia);
    if (red.suya) return resolverRed();
    bloquear(true);
    ponerEstado('Esperando a que elija ' + red.rival + '…');
  }

  function resolverRed() {
    var mia = red.mia, suya = red.suya;
    red.ronda++;
    red.mia = red.suya = null;
    var esta = red;
    mostrar(mia, suya, function () {
      var bs = el.opciones.querySelectorAll('button');
      for (var i = 0; i < bs.length; i++) bs[i].classList.remove('elegida');
      // Si el otro ya eligió la siguiente mientras tanto, se le espera aquí
      if (red === esta && red.suya) ponerEstado(red.rival + ' ya ha elegido. ¡Te toca!', 'gana');
    });
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- Controles ----------
  el.opciones.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b) jugar(b.getAttribute('data-jugada'));
  });

  el.niveles.addEventListener('click', function (e) {
    var n = e.target.getAttribute && e.target.getAttribute('data-nivel');
    if (!n || ocupado) return;
    if (n === 'cerca') {
      if (!sala) entrarCerca();
      return;
    }
    if (n === datos.nivel && !sala) return;
    salirCerca();
    datos.nivel = n;
    guardar();
    ponerEstado('Elige tu jugada');
    pintar();
  });

  document.getElementById('borrar').addEventListener('click', function () {
    if (ocupado) return;
    if (red) {
      red.marcador = { T: 0, E: 0, M: 0, racha: 0, mejor: 0 };
      return pintar();
    }
    datos.marcadores[datos.nivel] = {};
    guardar();
    pintar();
  });

  pintar();
})();
