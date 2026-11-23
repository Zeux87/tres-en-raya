// Interfaz de Conecta 4: tablero, turnos, marcador y ajustes.
// En "contra el móvil" tú juegas con rojas (R) y el móvil con amarillas (A).
(function () {
  'use strict';

  var C = window.Conecta4;
  var Android = window.Android;

  var CLAVE = 'conecta4.v1';
  var datos = cargar();

  var tablero, turno, terminada, ocupado, empiezaR = true, ficha = 0;
  var huecos = [];

  var el = {
    tablero: document.getElementById('tablero'),
    flechas: document.getElementById('flechas'),
    estado: document.getElementById('estado'),
    casR: document.getElementById('casR'),
    casA: document.getElementById('casA'),
    casE: document.getElementById('casE'),
    nombreR: document.getElementById('nombreR'),
    nombreA: document.getElementById('nombreA'),
    puntosR: document.getElementById('puntosR'),
    puntosA: document.getElementById('puntosA'),
    puntosE: document.getElementById('puntosE'),
    modos: document.getElementById('modos'),
    dificultades: document.getElementById('dificultades')
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'movil' && d.modo !== 'dos') d.modo = 'movil';
    if (['facil', 'normal', 'dificil'].indexOf(d.dificultad) < 0) d.dificultad = 'normal';
    if (!d.marcadores || typeof d.marcadores !== 'object') d.marcadores = {};
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }
  function claveMarcador() { return datos.modo === 'dos' ? 'dos' : 'movil-' + datos.dificultad; }
  function marcador() {
    var k = claveMarcador();
    if (!datos.marcadores[k]) datos.marcadores[k] = { R: 0, A: 0, E: 0 };
    return datos.marcadores[k];
  }

  // ---------- Utilidades ----------
  function contraMovil() { return datos.modo === 'movil'; }
  function nombre(f) {
    if (contraMovil()) return f === 'R' ? 'Tú' : 'El móvil';
    return f === 'R' ? 'Rojas' : 'Amarillas';
  }
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
  function crearTablero() {
    el.tablero.innerHTML = '';
    el.flechas.innerHTML = '';
    el.tablero.classList.remove('terminado');
    huecos = [];
    for (var c = 0; c < C.COLS; c++) el.flechas.appendChild(document.createElement('span'));
    for (var i = 0; i < C.TOTAL; i++) {
      var h = document.createElement('div');
      h.className = 'hueco';
      h.setAttribute('data-col', String(i % C.COLS));
      el.tablero.appendChild(h);
      huecos.push(h);
    }
  }

  function pintarAjustes() {
    var bm = el.modos.querySelectorAll('button');
    for (var i = 0; i < bm.length; i++) bm[i].classList.toggle('activo', bm[i].getAttribute('data-modo') === datos.modo);
    var bd = el.dificultades.querySelectorAll('button');
    for (var j = 0; j < bd.length; j++) bd[j].classList.toggle('activo', bd[j].getAttribute('data-dif') === datos.dificultad);
    el.dificultades.classList.toggle('oculto', !contraMovil());
    el.nombreR.textContent = contraMovil() ? 'Tú' : 'Rojas';
    el.nombreA.textContent = contraMovil() ? 'Móvil' : 'Amarillas';
  }

  function pintarMarcador() {
    var m = marcador();
    el.puntosR.textContent = m.R;
    el.puntosA.textContent = m.A;
    el.puntosE.textContent = m.E;
  }

  function pintarTurno() {
    el.casR.classList.toggle('turno', !terminada && turno === 'R');
    el.casA.classList.toggle('turno', !terminada && turno === 'A');
    document.documentElement.style.setProperty('--color-turno', turno === 'R' ? 'var(--rojo)' : 'var(--amarillo)');
    var texto;
    if (contraMovil()) texto = turno === 'R' ? 'Te toca: toca una columna' : 'El móvil está pensando…';
    else texto = 'Turno de ' + (turno === 'R' ? 'rojas' : 'amarillas');
    ponerEstado(texto);
  }

  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }

  function marcarFlecha(col) {
    var fs = el.flechas.children;
    for (var i = 0; i < fs.length; i++) fs[i].classList.toggle('ver', i === col);
  }

  // ---------- Juego ----------
  function nuevaPartida() {
    ficha++; // invalida jugadas del móvil pendientes
    tablero = C.nuevo();
    terminada = false;
    ocupado = false;
    turno = empiezaR ? 'R' : 'A';
    empiezaR = !empiezaR; // la próxima empieza el otro color
    crearTablero();
    pintarAjustes();
    pintarMarcador();
    pintarTurno();
    if (contraMovil() && turno === 'A') turnoMovil();
  }

  function puedeTocar() {
    return !terminada && !ocupado && !(contraMovil() && turno === 'A');
  }

  function columnaDe(evento) {
    var t = evento.target.closest ? evento.target.closest('.hueco') : null;
    return t ? parseInt(t.getAttribute('data-col'), 10) : -1;
  }

  el.tablero.addEventListener('pointerdown', function (e) {
    if (!puedeTocar()) return;
    var col = columnaDe(e);
    if (col >= 0) marcarFlecha(col);
  });

  el.tablero.addEventListener('click', function (e) {
    if (!puedeTocar()) return;
    var col = columnaDe(e);
    if (col < 0) return;
    if (C.filaLibre(tablero, col) < 0) {
      ponerEstado('Esa columna está llena');
      vibrar(30);
      return;
    }
    jugar(col, function () {
      if (!terminada && contraMovil()) turnoMovil();
    });
  });

  function turnoMovil() {
    var mia = ficha;
    ocupado = true;
    // Pequeña pausa para que se vea "pensando…" antes de calcular
    setTimeout(function () {
      if (mia !== ficha || terminada) return;
      var col = C.jugadaMovil(tablero, 'A', datos.dificultad);
      setTimeout(function () {
        if (mia !== ficha || terminada) return;
        if (col >= 0) jugar(col);
      }, 150);
    }, 350);
  }

  // Suelta la ficha del turno actual en la columna, con animación de caída
  function jugar(col, despues) {
    var mia = ficha;
    var casilla = C.soltar(tablero, col, turno);
    if (casilla < 0) return;
    ocupado = true;
    marcarFlecha(col);

    var filas = Math.floor(casilla / C.COLS) + 1;
    var f = document.createElement('div');
    f.className = 'ficha cae ' + turno;
    f.style.setProperty('--filas', String(filas));
    f.style.setProperty('--tiempo', (0.12 + 0.05 * filas).toFixed(2) + 's');
    huecos[casilla].appendChild(f);

    var hecho = false;
    function alCaer() {
      if (hecho || mia !== ficha) return;
      hecho = true;
      f.classList.remove('cae');
      vibrar(14);
      ocupado = false;

      var linea = C.lineaDesde(tablero, casilla);
      if (linea) return finPartida({ ficha: tablero[casilla], linea: linea });
      if (!C.columnasLibres(tablero).length) return finPartida('empate');

      turno = C.rival(turno);
      marcarFlecha(-1);
      pintarTurno();
      if (despues) despues();
    }
    f.addEventListener('animationend', alCaer);
    setTimeout(alCaer, 700); // por si la animación no avisa
  }

  function finPartida(r) {
    terminada = true;
    ocupado = false;
    marcarFlecha(-1);
    el.casR.classList.remove('turno');
    el.casA.classList.remove('turno');
    var m = marcador();
    if (r === 'empate') {
      m.E++;
      ponerEstado('Empate: tablero lleno');
      saltar(el.casE);
      vibrar(60);
    } else {
      m[r.ficha]++;
      el.tablero.classList.add('terminado');
      r.linea.forEach(function (c) {
        var fi = huecos[c].querySelector('.ficha');
        if (fi) fi.classList.add('ganadora');
      });
      var texto;
      if (contraMovil()) texto = r.ficha === 'R' ? '¡Has ganado! 🎉' : 'Gana el móvil';
      else texto = '¡Ganan las ' + (r.ficha === 'R' ? 'rojas' : 'amarillas') + '! 🎉';
      ponerEstado(texto, 'gana-' + r.ficha);
      saltar(r.ficha === 'R' ? el.casR : el.casA);
      vibrar(r.ficha === 'R' || !contraMovil() ? 220 : 90);
    }
    guardar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  el.modos.addEventListener('click', function (e) {
    var m = e.target.getAttribute && e.target.getAttribute('data-modo');
    if (!m || m === datos.modo) return;
    datos.modo = m;
    guardar();
    empiezaR = true;
    nuevaPartida();
  });

  el.dificultades.addEventListener('click', function (e) {
    var d = e.target.getAttribute && e.target.getAttribute('data-dif');
    if (!d || d === datos.dificultad) return;
    datos.dificultad = d;
    guardar();
    empiezaR = true;
    nuevaPartida();
  });

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    datos.marcadores[claveMarcador()] = { R: 0, A: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  nuevaPartida();
})();
