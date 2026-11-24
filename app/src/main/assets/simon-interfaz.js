// Pantalla de Simón dice: muestra la secuencia con luz y sonido y comprueba lo que tocas.
(function () {
  'use strict';

  var S = window.Simon;
  var P = window.Plataforma;
  var NIVELES = ['lento', 'normal', 'rapido'];
  var NOTAS = [329.63, 261.63, 220.0, 164.81]; // mi, do, la, mi grave

  var almacen = P.almacen('simon');
  var datos = almacen.leer('v1', null);
  if (!datos || typeof datos !== 'object') datos = {};
  if (NIVELES.indexOf(datos.nivel) < 0) datos.nivel = 'normal';
  if (!datos.records || typeof datos.records !== 'object') datos.records = {};
  if (datos.sonido !== 'no') datos.sonido = 'si';

  var e = null, fase = 'inicio'; // inicio, mostrando, repitiendo, fin
  var turno = 0; // invalida temporizadores viejos
  var audio = null;

  var el = {
    simon: document.getElementById('simon'),
    teclas: document.querySelectorAll('.tecla'),
    puntos: document.getElementById('puntos'),
    record: document.getElementById('record'),
    estado: document.getElementById('estado'),
    centroNum: document.getElementById('centroNum'),
    centroTexto: document.getElementById('centroTexto')
  };

  function guardar() { almacen.escribir('v1', datos); }
  function record() { return datos.records[datos.nivel] || 0; }

  var niveles = P.segmentos(document.getElementById('niveles'), datos.nivel, function (n) {
    datos.nivel = n;
    guardar();
    parar();
  });
  P.segmentos(document.getElementById('sonido'), datos.sonido, function (v) {
    datos.sonido = v;
    guardar();
  });

  // ---------- Sonido ----------
  function sonar(c, ms, error) {
    if (datos.sonido !== 'si') return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = error ? 'sawtooth' : 'triangle';
      o.frequency.value = error ? 110 : NOTAS[c];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.connect(g);
      g.connect(audio.destination);
      o.start(t);
      o.stop(t + ms / 1000 + 0.05);
    } catch (err) { /* sin sonido */ }
  }

  function encender(c, ms) {
    var t = el.teclas[c];
    t.classList.add('luz');
    sonar(c, ms);
    setTimeout(function () { t.classList.remove('luz'); }, ms);
  }

  // ---------- Pintado ----------
  function pintar() {
    el.puntos.textContent = e ? S.puntos(e) : 0;
    el.record.textContent = record();
    niveles.poner(datos.nivel);
    if (fase === 'inicio' || fase === 'fin') {
      el.centroNum.textContent = '▶';
      el.centroTexto.textContent = fase === 'fin' ? 'Otra vez' : 'Empezar';
    } else {
      el.centroNum.textContent = String(e.secuencia.length);
      el.centroTexto.textContent = fase === 'mostrando' ? 'Mira' : 'Repite';
    }
  }

  // ---------- Juego ----------
  function empezar() {
    turno++;
    e = S.nuevo();
    mostrar();
  }

  function parar() {
    turno++;
    e = null;
    fase = 'inicio';
    el.estado.textContent = 'Mira, escucha y repite';
    pintar();
  }

  function mostrar() {
    var mio = ++turno;
    fase = 'mostrando';
    el.estado.textContent = 'Mira…';
    pintar();
    var ms = S.duracion(datos.nivel, e.secuencia.length);
    var hueco = Math.round(ms * 0.35);
    var k = 0;
    function siguiente() {
      if (mio !== turno) return;
      if (k >= e.secuencia.length) {
        fase = 'repitiendo';
        el.estado.textContent = 'Tu turno';
        pintar();
        return;
      }
      encender(e.secuencia[k++], ms);
      setTimeout(siguiente, ms + hueco);
    }
    setTimeout(siguiente, 600);
  }

  function pulsar(c) {
    if (fase !== 'repitiendo') return;
    var r = S.pulsar(e, c);
    if (r === 'mal') return fallo(c);
    encender(c, 220);
    P.vibrar(10);
    if (r === 'ronda') {
      fase = 'mostrando';
      S.crecer(e);
      var p = S.puntos(e);
      if (p > record()) { datos.records[datos.nivel] = p; guardar(); }
      el.estado.textContent = p % 5 === 0 ? '¡' + p + ' rondas! 🔥' : '¡Bien!';
      pintar();
      var mio = turno;
      setTimeout(function () { if (mio === turno) mostrar(); }, 700);
    }
  }

  function fallo(c) {
    turno++;
    fase = 'fin';
    sonar(c, 600, true);
    P.vibrar(200);
    el.simon.classList.remove('fallo');
    void el.simon.offsetWidth;
    el.simon.classList.add('fallo');
    // Enseña cuál tocaba
    var bueno = e.secuencia[e.pos];
    el.teclas[bueno].classList.add('luz');
    setTimeout(function () { el.teclas[bueno].classList.remove('luz'); }, 900);
    var p = S.puntos(e);
    var nuevo = p > 0 && p >= record();
    el.estado.textContent = (nuevo ? '¡Récord! ' : 'Fallaste. ') + p + (p === 1 ? ' ronda' : ' rondas');
    pintar();
  }

  // ---------- Controles ----------
  el.simon.addEventListener('pointerdown', function (ev) {
    var t = ev.target.closest ? ev.target.closest('.tecla') : null;
    if (!t) return;
    ev.preventDefault();
    pulsar(parseInt(t.getAttribute('data-c'), 10));
  });
  document.getElementById('centro').addEventListener('click', function () {
    if (fase === 'inicio' || fase === 'fin') empezar();
  });
  document.addEventListener('keydown', function (ev) {
    var k = { '1': 0, '2': 1, '3': 2, '4': 3 }[ev.key];
    if (k !== undefined) pulsar(k);
    else if (ev.key === ' ' || ev.key === 'Enter') { if (fase === 'inicio' || fase === 'fin') empezar(); }
  });
  // Si sales a mitad, la partida se pierde (no tiene sentido guardarla)
  document.addEventListener('visibilitychange', function () { if (document.hidden && (fase === 'mostrando' || fase === 'repitiendo')) parar(); });

  pintar();
})();
