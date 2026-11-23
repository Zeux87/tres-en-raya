// Interfaz de Memoria: tablero de cartas, turnos, cronómetro, récords y ajustes.
// Solo: encuentra todas las parejas en los menos intentos posibles (récord por nivel).
// 2 jugadores: por turnos; si encuentras pareja, repites. Gana quien tenga más parejas.
(function () {
  'use strict';

  var M = window.Memoria;
  var Android = window.Android;

  var CLAVE = 'memoria.v1';
  var datos = cargar();

  var partida, cartas = [], ficha = 0, bloqueo = false;
  var inicio = 0, reloj = null, empieza = 1;

  var el = {
    pantalla: document.getElementById('pantalla'),
    tablero: document.getElementById('tablero'),
    estado: document.getElementById('estado'),
    modos: document.getElementById('modos'),
    niveles: document.getElementById('niveles'),
    cas: [null, document.getElementById('cas1'), document.getElementById('cas2'), document.getElementById('cas3')],
    nombre: [null, document.getElementById('nombre1'), document.getElementById('nombre2'), document.getElementById('nombre3')],
    valor: [null, document.getElementById('valor1'), document.getElementById('valor2'), document.getElementById('valor3')]
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'solo' && d.modo !== 'dos') d.modo = 'solo';
    if (!M.NIVELES[d.nivel]) d.nivel = 'normal';
    if (!d.records || typeof d.records !== 'object') d.records = {};
    if (!d.victorias || typeof d.victorias !== 'object') d.victorias = { 1: 0, 2: 0, E: 0 };
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  function solo() { return datos.modo === 'solo'; }
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
  function segundos() { return inicio ? Math.floor((Date.now() - inicio) / 1000) : 0; }
  function mmss(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }
  function pararReloj() {
    if (reloj) clearInterval(reloj);
    reloj = null;
  }

  // ---------- Pintado ----------
  function pintarAjustes() {
    var bm = el.modos.querySelectorAll('button');
    for (var i = 0; i < bm.length; i++) bm[i].classList.toggle('activo', bm[i].getAttribute('data-modo') === datos.modo);
    var bn = el.niveles.querySelectorAll('button');
    for (var j = 0; j < bn.length; j++) bn[j].classList.toggle('activo', bn[j].getAttribute('data-nivel') === datos.nivel);
    el.pantalla.classList.toggle('dos', !solo());
    if (solo()) {
      el.nombre[1].textContent = 'Intentos';
      el.nombre[2].textContent = 'Tiempo';
      el.nombre[3].textContent = 'Récord';
    } else {
      el.nombre[1].textContent = 'Jugador 1';
      el.nombre[2].textContent = 'Quedan';
      el.nombre[3].textContent = 'Jugador 2';
    }
  }

  function pintarMarcador() {
    if (solo()) {
      var r = datos.records[datos.nivel];
      el.valor[1].textContent = partida.intentos;
      el.valor[2].textContent = mmss(segundos());
      el.valor[3].textContent = r ? r.intentos : '–';
      for (var i = 1; i <= 3; i++) el.cas[i].classList.remove('turno');
    } else {
      // Las victorias acumuladas van junto al nombre
      el.nombre[1].textContent = 'Jugador 1 🏆' + datos.victorias[1];
      el.nombre[3].textContent = 'Jugador 2 🏆' + datos.victorias[2];
      el.valor[1].textContent = partida.puntos[1];
      el.valor[2].textContent = partida.cartas.length / 2 - partida.parejas;
      el.valor[3].textContent = partida.puntos[2];
      var fin = M.terminada(partida);
      el.cas[1].classList.toggle('turno', !fin && partida.turno === 1);
      el.cas[3].classList.toggle('turno', !fin && partida.turno === 2);
    }
  }

  function pintarTurno() {
    if (solo()) ponerEstado(partida.intentos ? 'Sigue buscando parejas' : 'Toca dos cartas para buscar su pareja');
    else ponerEstado('Turno del jugador ' + partida.turno, 'j' + partida.turno);
  }

  function crearTablero() {
    el.tablero.innerHTML = '';
    el.tablero.style.setProperty('--cols', String(partida.cols));
    el.tablero.classList.toggle('cinco', partida.cols >= 5);
    cartas = [];
    for (var i = 0; i < partida.cartas.length; i++) {
      var b = document.createElement('button');
      b.className = 'carta';
      b.setAttribute('data-i', String(i));
      b.setAttribute('aria-label', 'Carta ' + (i + 1));
      var dentro = document.createElement('span');
      dentro.className = 'interior';
      var dorso = document.createElement('span');
      dorso.className = 'cara dorso';
      var frente = document.createElement('span');
      frente.className = 'cara frente';
      frente.textContent = partida.cartas[i];
      dentro.appendChild(dorso);
      dentro.appendChild(frente);
      b.appendChild(dentro);
      el.tablero.appendChild(b);
      cartas.push(b);
    }
  }

  // ---------- Juego ----------
  function nuevaPartida() {
    ficha++; // invalida temporizadores pendientes
    pararReloj();
    inicio = 0;
    bloqueo = false;
    partida = M.nueva(datos.nivel, solo() ? 1 : 2);
    if (!solo()) {
      partida.turno = empieza;
      empieza = empieza === 1 ? 2 : 1; // la próxima empieza el otro
    }
    pintarAjustes();
    crearTablero();
    pintarMarcador();
    pintarTurno();
  }

  el.tablero.addEventListener('click', function (e) {
    if (bloqueo || M.terminada(partida)) return;
    var c = e.target.closest ? e.target.closest('.carta') : null;
    if (!c) return;
    var i = parseInt(c.getAttribute('data-i'), 10);
    var r = M.voltear(partida, i);
    if (r === 'invalida') return;

    if (!inicio) {
      inicio = Date.now();
      if (solo()) reloj = setInterval(pintarMarcador, 1000);
    }
    c.classList.add('arriba');
    c.classList.remove('mal');
    vibrar(10);

    if (r === 'pareja') {
      partida.dueno.forEach(function (d, k) {
        if (d && !cartas[k].classList.contains('hecha')) cartas[k].classList.add('hecha', 'de' + d);
      });
      pintarMarcador();
      if (M.terminada(partida)) return finPartida();
      ponerEstado(solo() ? '¡Pareja!' : '¡Pareja! Repite el jugador ' + partida.turno, solo() ? 'bien' : 'j' + partida.turno);
      vibrar(40);
    } else if (r === 'fallo') {
      pintarMarcador();
      bloqueo = true;
      var mia = ficha;
      var par = partida.arriba.slice();
      setTimeout(function () {
        if (mia !== ficha) return;
        par.forEach(function (k) { cartas[k].classList.add('mal'); });
      }, 380);
      setTimeout(function () {
        if (mia !== ficha) return;
        par.forEach(function (k) { cartas[k].classList.remove('arriba', 'mal'); });
        M.tapar(partida);
        bloqueo = false;
        pintarMarcador();
        pintarTurno();
      }, 1050);
    }
  });

  function finPartida() {
    pararReloj();
    var r = M.resultado(partida);
    if (solo()) {
      var nuevo = { intentos: r.intentos, segundos: segundos() };
      var record = M.mejorRecord(datos.records[datos.nivel], nuevo);
      if (record) datos.records[datos.nivel] = nuevo;
      ponerEstado((record ? '¡Nuevo récord! ' : '¡Completado! ') + r.intentos + ' intentos en ' + mmss(nuevo.segundos) + ' 🎉', 'bien');
      if (record) saltar(el.cas[3]);
      vibrar(220);
    } else {
      if (r.ganador) {
        datos.victorias[r.ganador]++;
        ponerEstado('¡Gana el jugador ' + r.ganador + '! 🎉 (' + r.puntos[0] + ' a ' + r.puntos[1] + ')', 'j' + r.ganador);
        saltar(el.cas[r.ganador === 1 ? 1 : 3]);
      } else {
        datos.victorias.E++;
        ponerEstado('Empate a ' + r.puntos[0] + ' parejas');
      }
      vibrar(220);
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
    empieza = 1;
    nuevaPartida();
  });

  el.niveles.addEventListener('click', function (e) {
    var n = e.target.getAttribute && e.target.getAttribute('data-nivel');
    if (!n || n === datos.nivel) return;
    datos.nivel = n;
    guardar();
    empieza = 1;
    nuevaPartida();
  });

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    if (solo()) delete datos.records[datos.nivel];
    else datos.victorias = { 1: 0, 2: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  nuevaPartida();
})();
