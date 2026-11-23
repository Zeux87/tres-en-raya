// Interfaz del Buscaminas: tablero, reloj, banderas (botón o pulsación larga),
// récords por nivel y partida guardada si se sale de la pantalla.
(function () {
  'use strict';

  var B = window.Buscaminas;
  var Android = window.Android;

  var CLAVE = 'buscaminas.v1';
  var PULSACION_LARGA = 420; // ms

  var datos = cargar();
  var t, segundos, intervalo = null, casillas = [];
  var largo = { temporizador: null, hecho: false, casilla: -1 };

  var el = {
    niveles: document.getElementById('niveles'),
    herramienta: document.getElementById('herramienta'),
    tablero: document.getElementById('tablero'),
    quedan: document.getElementById('quedan'),
    reloj: document.getElementById('reloj'),
    cara: document.getElementById('cara'),
    estado: document.getElementById('estado'),
    record: document.getElementById('record')
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (!B.NIVELES[d.nivel]) d.nivel = 'facil';
    if (d.modo !== 'abrir' && d.modo !== 'bandera') d.modo = 'abrir';
    if (!d.partidas || typeof d.partidas !== 'object') d.partidas = {};
    if (!d.stats || typeof d.stats !== 'object') d.stats = {};
    return d;
  }
  function guardar() {
    if (t) {
      if (t.fase === 'jugando') datos.partidas[datos.nivel] = { tablero: t, segundos: segundos };
      else delete datos.partidas[datos.nivel];
    }
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }
  function stats() {
    var s = datos.stats[datos.nivel];
    if (!s || typeof s !== 'object') s = datos.stats[datos.nivel] = {};
    if (typeof s.jugadas !== 'number') s.jugadas = 0;
    if (typeof s.ganadas !== 'number') s.ganadas = 0;
    if (typeof s.mejor !== 'number') s.mejor = 0;
    return s;
  }

  // ---------- Utilidades ----------
  function vibrar(ms) {
    try {
      if (Android && Android.vibrar) Android.vibrar(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }
  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }

  // ---------- Reloj ----------
  function arrancarReloj() {
    pararReloj();
    intervalo = setInterval(function () {
      if (t.fase !== 'jugando' || document.hidden) return;
      segundos++;
      pintarReloj();
      if (segundos % 5 === 0) guardar();
    }, 1000);
  }
  function pararReloj() {
    if (intervalo) clearInterval(intervalo);
    intervalo = null;
  }
  function pintarReloj() { el.reloj.textContent = '⏱ ' + Math.min(segundos, 9999); }

  // ---------- Pintado ----------
  function crearTablero() {
    el.tablero.innerHTML = '';
    el.tablero.style.gridTemplateColumns = 'repeat(' + t.cols + ', 1fr)';
    el.tablero.style.setProperty('--letra', t.cols > 10 ? '15px' : '18px');
    casillas = [];
    for (var i = 0; i < t.filas * t.cols; i++) {
      var c = document.createElement('div');
      c.className = 'casilla';
      c.setAttribute('data-i', String(i));
      el.tablero.appendChild(c);
      casillas.push(c);
    }
  }

  function pintarCasilla(i) {
    var c = casillas[i], cls = 'casilla', txt = '';
    var fin = t.fase === 'perdida';
    if (t.abierta[i]) {
      if (t.mina[i]) { cls += ' mina explotada'; txt = '💥'; }
      else {
        cls += ' abierta';
        var n = B.cuenta(t, i);
        if (n) { cls += ' n' + n; txt = String(n); }
      }
    } else if (fin && t.mina[i] && !t.bandera[i]) {
      cls += ' mina'; txt = '💣';
    } else if (fin && t.bandera[i] && !t.mina[i]) {
      cls += ' fallo'; txt = '🚩';
    } else if (t.bandera[i]) {
      txt = '🚩';
    }
    c.className = cls;
    c.textContent = txt;
  }

  function pintar() {
    for (var i = 0; i < casillas.length; i++) pintarCasilla(i);
    el.quedan.textContent = '💣 ' + (t.minas - B.banderas(t));
    pintarReloj();
    el.cara.textContent = t.fase === 'ganada' ? '😎' : t.fase === 'perdida' ? '😵' : '🙂';
    var bs = el.niveles.querySelectorAll('button');
    for (var j = 0; j < bs.length; j++) bs[j].classList.toggle('activo', bs[j].getAttribute('data-nivel') === datos.nivel);
    var bh = el.herramienta.querySelectorAll('button');
    for (var k = 0; k < bh.length; k++) bh[k].classList.toggle('activo', bh[k].getAttribute('data-modo') === datos.modo);
    var s = stats();
    var txt = 'Ganadas ' + s.ganadas + ' de ' + s.jugadas;
    if (s.mejor) txt += ' · Récord: ' + s.mejor + ' s';
    el.record.textContent = txt;
  }

  function pintarEstadoInicial() {
    if (t.fase === 'nueva') ponerEstado('Toca una casilla para empezar');
    else ponerEstado('Mantén pulsado para poner una bandera');
  }

  // ---------- Juego ----------
  function empezar(continuar) {
    var guardada = datos.partidas[datos.nivel];
    if (continuar && guardada && B.valido(guardada.tablero) && guardada.tablero.fase === 'jugando') {
      t = guardada.tablero;
      segundos = typeof guardada.segundos === 'number' ? guardada.segundos : 0;
    } else {
      var n = B.NIVELES[datos.nivel];
      t = B.nuevo(n.filas, n.cols, n.minas);
      segundos = 0;
      delete datos.partidas[datos.nivel];
    }
    crearTablero();
    pintar();
    pintarEstadoInicial();
    if (t.fase === 'jugando') arrancarReloj(); else pararReloj();
    guardar();
  }

  function abrir(i) {
    var antes = t.fase;
    var abiertas = t.abierta[i] ? B.descubrirAlrededor(t, i) : B.descubrir(t, i);
    if (!abiertas.length) {
      if (t.bandera[i]) { ponerEstado('Quita la bandera para abrir esa casilla'); vibrar(20); }
      return;
    }
    if (antes === 'nueva' && t.fase === 'jugando') {
      stats().jugadas++;
      arrancarReloj();
      ponerEstado('Mantén pulsado para poner una bandera');
    }
    vibrar(8);
    despuesDeJugar(antes);
  }

  function bandera(i) {
    if (t.fase === 'nueva') { ponerEstado('Primero descubre una casilla'); return; }
    if (t.abierta[i]) { abrir(i); return; } // en un número abierto, abre alrededor
    if (B.alternarBandera(t, i)) {
      vibrar(25);
      pintarCasilla(i);
      el.quedan.textContent = '💣 ' + (t.minas - B.banderas(t));
      guardar();
    }
  }

  function despuesDeJugar(antes) {
    if (t.fase === 'ganada' || t.fase === 'perdida') {
      pararReloj();
      var s = stats();
      if (antes === 'nueva') s.jugadas++; // ganada al primer toque
      if (t.fase === 'ganada') {
        s.ganadas++;
        var record = !s.mejor || segundos < s.mejor;
        if (record) s.mejor = Math.max(1, segundos);
        ponerEstado(record ? '¡Nuevo récord! ' + segundos + ' segundos 🎉' : '¡Limpio! ' + segundos + ' segundos 🎉', 'gana');
        vibrar(220);
      } else {
        ponerEstado('¡Boom! Toca la cara para otra partida', 'pierde');
        vibrar(300);
      }
    }
    guardar();
    pintar();
  }

  // ---------- Controles del tablero ----------
  function indiceDe(evento) {
    var c = evento.target.closest ? evento.target.closest('.casilla') : null;
    return c ? parseInt(c.getAttribute('data-i'), 10) : -1;
  }
  function cancelarLargo() {
    if (largo.temporizador) clearTimeout(largo.temporizador);
    largo.temporizador = null;
    if (largo.casilla >= 0 && casillas[largo.casilla]) casillas[largo.casilla].classList.remove('pulsada');
  }

  el.tablero.addEventListener('pointerdown', function (e) {
    var i = indiceDe(e);
    cancelarLargo();
    largo.hecho = false;
    largo.casilla = i;
    if (i < 0 || t.fase === 'ganada' || t.fase === 'perdida') return;
    casillas[i].classList.add('pulsada');
    largo.temporizador = setTimeout(function () {
      largo.temporizador = null;
      largo.hecho = true;
      casillas[i].classList.remove('pulsada');
      // La pulsación larga hace lo contrario de la herramienta elegida
      if (datos.modo === 'abrir') bandera(i); else abrir(i);
    }, PULSACION_LARGA);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    el.tablero.addEventListener(ev, cancelarLargo);
  });
  el.tablero.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  el.tablero.addEventListener('click', function (e) {
    var i = indiceDe(e);
    if (largo.hecho) { largo.hecho = false; return; }
    if (i < 0 || t.fase === 'ganada' || t.fase === 'perdida') return;
    if (datos.modo === 'abrir') abrir(i); else bandera(i);
  });

  // ---------- Otros controles ----------
  el.cara.addEventListener('click', function () { empezar(false); });

  el.niveles.addEventListener('click', function (e) {
    var n = e.target.getAttribute && e.target.getAttribute('data-nivel');
    if (!n || n === datos.nivel) return;
    guardar(); // la partida del nivel actual se queda guardada
    datos.nivel = n;
    empezar(true);
  });

  el.herramienta.addEventListener('click', function (e) {
    var m = e.target.getAttribute && e.target.getAttribute('data-modo');
    if (!m || m === datos.modo) return;
    datos.modo = m;
    guardar();
    pintar();
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) guardar(); });
  window.addEventListener('pagehide', guardar);

  empezar(true);
})();
