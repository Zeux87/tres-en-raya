// Interfaz del 3 en raya: dibuja el tablero, gestiona turnos, marcador y ajustes.
(function () {
  'use strict';

  var T = window.TresEnRaya;
  var Android = window.Android; // puente nativo (solo existe dentro de la app)
  var SVG = 'http://www.w3.org/2000/svg';

  var CLAVE = 'tresenraya.v1';
  var datos = cargar();

  var tablero, turno, terminada, empiezaX = true, ficha = 0;

  var el = {
    tablero: document.getElementById('tablero'),
    linea: document.getElementById('linea'),
    estado: document.getElementById('estado'),
    casX: document.getElementById('casX'),
    casO: document.getElementById('casO'),
    nombreX: document.getElementById('nombreX'),
    nombreO: document.getElementById('nombreO'),
    puntosX: document.getElementById('puntosX'),
    puntosE: document.getElementById('puntosE'),
    puntosO: document.getElementById('puntosO'),
    modos: document.getElementById('modos'),
    dificultades: document.getElementById('dificultades'),
    pie: document.getElementById('pie')
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'movil' && d.modo !== 'dos') d.modo = 'movil';
    if (['facil', 'normal', 'imposible'].indexOf(d.dificultad) < 0) d.dificultad = 'normal';
    if (!d.marcadores || typeof d.marcadores !== 'object') d.marcadores = {};
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }
  function claveMarcador() {
    return datos.modo === 'dos' ? 'dos' : 'movil-' + datos.dificultad;
  }
  function marcador() {
    var k = claveMarcador();
    if (!datos.marcadores[k]) datos.marcadores[k] = { X: 0, O: 0, E: 0 };
    return datos.marcadores[k];
  }

  // ---------- Utilidades ----------
  function contraMovil() { return datos.modo === 'movil'; }

  function vibrar(ms) {
    try {
      if (Android && Android.vibrar) Android.vibrar(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }

  function dibujoFicha(f) {
    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    if (f === 'X') {
      [[15, 15, 85, 85], [85, 15, 15, 85]].forEach(function (p, i) {
        var l = document.createElementNS(SVG, 'line');
        l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]);
        l.setAttribute('x2', p[2]); l.setAttribute('y2', p[3]);
        l.setAttribute('pathLength', '1');
        l.setAttribute('class', 'trazo x' + (i ? ' retraso' : ''));
        svg.appendChild(l);
      });
    } else {
      var c = document.createElementNS(SVG, 'circle');
      c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 36);
      c.setAttribute('pathLength', '1');
      c.setAttribute('transform', 'rotate(-90 50 50)');
      c.setAttribute('class', 'trazo o');
      svg.appendChild(c);
    }
    return svg;
  }

  // ---------- Pintado ----------
  function pintarAjustes() {
    var bm = el.modos.querySelectorAll('button');
    for (var i = 0; i < bm.length; i++) bm[i].classList.toggle('activo', bm[i].getAttribute('data-modo') === datos.modo);
    var bd = el.dificultades.querySelectorAll('button');
    for (var j = 0; j < bd.length; j++) bd[j].classList.toggle('activo', bd[j].getAttribute('data-dif') === datos.dificultad);
    el.dificultades.classList.toggle('oculto', !contraMovil());
    el.nombreX.textContent = contraMovil() ? 'Tú (X)' : 'Jugador X';
    el.nombreO.textContent = contraMovil() ? 'Móvil (O)' : 'Jugador O';
  }

  function pintarMarcador() {
    var m = marcador();
    el.puntosX.textContent = m.X;
    el.puntosO.textContent = m.O;
    el.puntosE.textContent = m.E;
  }

  function pintarTurno() {
    el.casX.classList.toggle('turno', !terminada && turno === 'X');
    el.casO.classList.toggle('turno', !terminada && turno === 'O');
  }

  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }

  function textoTurno() {
    if (contraMovil()) return turno === 'X' ? 'Te toca' : 'El móvil está pensando…';
    return 'Turno de ' + turno;
  }

  function crearTablero() {
    el.tablero.innerHTML = '';
    el.linea.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var b = document.createElement('button');
      b.className = 'casilla';
      b.setAttribute('aria-label', 'Casilla ' + (i + 1));
      b.addEventListener('click', pulsar.bind(null, i));
      el.tablero.appendChild(b);
    }
  }

  function dibujarLinea(linea, f) {
    var a = linea[0], b = linea[2];
    var x1 = (a % 3) * 100 + 50, y1 = Math.floor(a / 3) * 100 + 50;
    var x2 = (b % 3) * 100 + 50, y2 = Math.floor(b / 3) * 100 + 50;
    // Alargar un poco la línea por los extremos
    var dx = x2 - x1, dy = y2 - y1, largo = Math.sqrt(dx * dx + dy * dy);
    var ex = dx / largo * 32, ey = dy / largo * 32;
    var l = document.createElementNS(SVG, 'line');
    l.setAttribute('x1', x1 - ex); l.setAttribute('y1', y1 - ey);
    l.setAttribute('x2', x2 + ex); l.setAttribute('y2', y2 + ey);
    l.setAttribute('pathLength', '1');
    l.setAttribute('stroke', f === 'X' ? 'var(--x)' : 'var(--o)');
    el.linea.appendChild(l);
  }

  function saltar(nodo) {
    nodo.classList.remove('salto');
    void nodo.offsetWidth; // reinicia la animación
    nodo.classList.add('salto');
  }

  // ---------- Juego ----------
  function nuevaPartida() {
    ficha++; // invalida jugadas del móvil pendientes
    tablero = [null, null, null, null, null, null, null, null, null];
    terminada = false;
    turno = empiezaX ? 'X' : 'O';
    empiezaX = !empiezaX; // la siguiente partida empieza el otro
    crearTablero();
    pintarAjustes();
    pintarMarcador();
    pintarTurno();
    ponerEstado(textoTurno());
    if (contraMovil() && turno === 'O') turnoMovil();
  }

  function pulsar(i) {
    if (terminada || tablero[i]) return;
    if (contraMovil() && turno !== 'X') return;
    jugar(i);
    if (!terminada && contraMovil()) turnoMovil();
  }

  function turnoMovil() {
    var mia = ficha;
    var espera = 380 + Math.random() * 320;
    setTimeout(function () {
      if (mia !== ficha || terminada) return;
      var c = T.jugadaMovil(tablero, 'O', datos.dificultad);
      if (c >= 0) jugar(c);
    }, espera);
  }

  function jugar(i) {
    tablero[i] = turno;
    var casilla = el.tablero.children[i];
    casilla.classList.add('ocupada');
    casilla.appendChild(dibujoFicha(turno));
    vibrar(12);

    var r = T.resultado(tablero);
    if (r) return finPartida(r);

    turno = T.rival(turno);
    pintarTurno();
    ponerEstado(textoTurno());
  }

  function finPartida(r) {
    terminada = true;
    pintarTurno();
    var m = marcador();
    var casillas = el.tablero.children;

    if (r === 'empate') {
      m.E++;
      ponerEstado('Empate');
      saltar(document.getElementById('casE'));
      vibrar(60);
    } else {
      m[r.ficha]++;
      for (var i = 0; i < 9; i++) {
        var gana = r.linea.indexOf(i) >= 0;
        casillas[i].classList.toggle('ganadora', gana);
        casillas[i].classList.toggle('apagada', !gana);
      }
      dibujarLinea(r.linea, r.ficha);
      var texto;
      if (contraMovil()) texto = r.ficha === 'X' ? '¡Has ganado! 🎉' : 'Gana el móvil';
      else texto = '¡Gana ' + r.ficha + '! 🎉';
      ponerEstado(texto, r.ficha === 'X' ? 'gana-x' : 'gana-o');
      saltar(r.ficha === 'X' ? el.casX : el.casO);
      vibrar(r.ficha === 'X' || !contraMovil() ? 180 : 90);
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
    empiezaX = true;
    nuevaPartida();
  });

  el.dificultades.addEventListener('click', function (e) {
    var d = e.target.getAttribute && e.target.getAttribute('data-dif');
    if (!d || d === datos.dificultad) return;
    datos.dificultad = d;
    guardar();
    empiezaX = true;
    nuevaPartida();
  });

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    datos.marcadores[claveMarcador()] = { X: 0, O: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  // ---------- Pie con versión y actualizaciones (solo en la app) ----------
  if (Android && Android.version) {
    var v = document.createElement('span');
    v.textContent = 'Versión ' + Android.version() + ' · ';
    var b = document.createElement('button');
    b.textContent = 'Buscar actualizaciones';
    b.addEventListener('click', function () { Android.buscarActualizacion(); });
    el.pie.appendChild(v);
    el.pie.appendChild(b);
  }

  nuevaPartida();
})();
