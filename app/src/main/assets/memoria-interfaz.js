// Interfaz de Memoria: tablero de cartas, turnos, cronómetro, récords y ajustes.
// Solo: encuentra todas las parejas en los menos intentos posibles (récord por nivel).
// 2 jugadores: por turnos; si encuentras pareja, repites. Gana quien tenga más parejas.
(function () {
  'use strict';

  var M = window.Memoria;
  var P = window.Plataforma;

  var almacen = P.almacen('memoria'); // ajustes, récords y victorias en "memoria.v1"
  var guardada = P.partida('memoria'); // partida a medias en "memoria.partida"
  var datos = cargar();

  var partida, cartas = [], ficha = 0, bloqueo = false;
  var inicio = 0, reloj = null, empieza = 1, mc = null;

  var el = {
    pantalla: document.getElementById('pantalla'),
    tablero: document.getElementById('tablero'),
    estado: document.getElementById('estado'),
    marcador: document.getElementById('marcador')
  };

  var modos = P.segmentos(document.getElementById('modos'), datos.modo, function (m) {
    datos.modo = m;
    cambiarAjustes();
  });
  var niveles = P.segmentos(document.getElementById('niveles'), datos.nivel, function (n) {
    datos.nivel = n;
    cambiarAjustes();
  });

  // ---------- Persistencia ----------
  function cargar() {
    var d = almacen.leer('v1', null);
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'solo' && d.modo !== 'dos') d.modo = 'solo';
    if (!M.NIVELES[d.nivel]) d.nivel = 'normal';
    if (!d.records || typeof d.records !== 'object') d.records = {};
    if (!d.victorias || typeof d.victorias !== 'object') d.victorias = {};
    P.marcadorDe(d, 'victorias', ['1', '2', 'E']);
    return d;
  }
  function guardar() { almacen.escribir('v1', datos); }

  // La partida a medias se guarda tras cada jugada y se borra al terminar
  function guardarPartida() {
    if (!partida || M.terminada(partida)) return guardada.borrar();
    if (!partida.intentos && !partida.arriba.length) return guardada.borrar(); // sin empezar
    guardada.guardar({ modo: datos.modo, nivel: datos.nivel, estado: partida, segundos: segundos(), empieza: empieza });
  }

  // ---------- Utilidades ----------
  function solo() { return datos.modo === 'solo'; }
  var vibrar = P.vibrar;
  function segundos() { return inicio ? Math.floor((Date.now() - inicio) / 1000) : 0; }
  function mmss(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = 'estado' + (clase ? ' ' + clase : '');
  }
  function arrancarReloj() {
    pararReloj();
    if (solo()) reloj = setInterval(pintarMarcador, 1000);
  }
  function pararReloj() {
    if (reloj) clearInterval(reloj);
    reloj = null;
  }

  // ---------- Pintado ----------
  function crearMarcador() {
    mc = P.marcador(el.marcador, solo()
      ? [{ id: 'intentos', nombre: 'Intentos' }, { id: 'tiempo', nombre: 'Tiempo' }, { id: 'record', nombre: 'Récord' }]
      : [{ id: '1', nombre: 'Jugador 1', color: 'var(--j1)' }, { id: 'Q', nombre: 'Quedan' }, { id: '2', nombre: 'Jugador 2', color: 'var(--j2)' }]);
  }

  function pintarAjustes() {
    modos.poner(datos.modo);
    niveles.poner(datos.nivel);
    el.pantalla.classList.toggle('dos', !solo());
    crearMarcador();
  }

  function pintarMarcador() {
    if (solo()) {
      var r = datos.records[datos.nivel];
      mc.pintar({ intentos: partida.intentos, tiempo: mmss(segundos()), record: r ? r.intentos : '–' });
    } else {
      // Las victorias acumuladas van junto al nombre
      mc.nombres({ 1: 'Jugador 1 🏆' + datos.victorias[1], 2: 'Jugador 2 🏆' + datos.victorias[2] });
      mc.pintar({ 1: partida.puntos[1], Q: String(partida.cartas.length / 2 - partida.parejas), 2: partida.puntos[2] });
      mc.turno(M.terminada(partida) ? null : String(partida.turno));
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
      if (partida.encontradas[i]) b.classList.add('arriba', 'hecha', 'de' + partida.dueno[i]);
      else if (partida.arriba.indexOf(i) >= 0) b.classList.add('arriba');
      el.tablero.appendChild(b);
      cartas.push(b);
    }
  }

  // ---------- Juego ----------
  function mostrar() {
    bloqueo = false;
    pintarAjustes();
    crearTablero();
    pintarMarcador();
    pintarTurno();
  }

  function nuevaPartida() {
    ficha++; // invalida temporizadores pendientes
    pararReloj();
    inicio = 0;
    partida = M.nueva(datos.nivel, solo() ? 1 : 2);
    if (!solo()) {
      partida.turno = empieza;
      empieza = empieza === 1 ? 2 : 1; // la próxima empieza el otro
    }
    guardada.borrar();
    mostrar();
  }

  // Recupera la partida a medias si es del modo y nivel actuales
  function recuperar() {
    var g = guardada.cargar();
    if (!g || g.modo !== datos.modo || g.nivel !== datos.nivel || !g.estado || !Array.isArray(g.estado.cartas)) return false;
    partida = g.estado;
    if (partida.arriba.length === 2) M.tapar(partida); // se cerró justo tras un fallo
    empieza = g.empieza === 2 ? 2 : 1;
    inicio = Date.now() - (g.segundos || 0) * 1000;
    mostrar();
    arrancarReloj();
    ponerEstado('Partida recuperada');
    return true;
  }

  function cambiarAjustes() {
    guardar();
    empieza = 1;
    nuevaPartida();
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
      arrancarReloj();
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
      guardarPartida();
    } else if (r === 'fallo') {
      pintarMarcador();
      guardarPartida();
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
        guardarPartida();
      }, 1050);
    }
  });

  function finPartida() {
    pararReloj();
    guardada.borrar();
    var r = M.resultado(partida);
    if (solo()) {
      var nuevo = { intentos: r.intentos, segundos: segundos() };
      var record = M.mejorRecord(datos.records[datos.nivel], nuevo);
      if (record) datos.records[datos.nivel] = nuevo;
      ponerEstado((record ? '¡Nuevo récord! ' : '¡Completado! ') + r.intentos + ' intentos en ' + mmss(nuevo.segundos) + ' 🎉', 'bien');
      if (record) mc.saltar('record');
    } else if (r.ganador) {
      datos.victorias[r.ganador]++;
      ponerEstado('¡Gana el jugador ' + r.ganador + '! 🎉 (' + r.puntos[0] + ' a ' + r.puntos[1] + ')', 'j' + r.ganador);
      mc.saltar(String(r.ganador));
    } else {
      datos.victorias.E++;
      ponerEstado('Empate a ' + r.puntos[0] + ' parejas');
    }
    vibrar(220);
    guardar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    if (solo()) delete datos.records[datos.nivel];
    else datos.victorias = { 1: 0, 2: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  // Al salir de la app se guarda el tiempo jugado
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && partida && !bloqueo) guardarPartida();
  });

  if (!recuperar()) nuevaPartida();
})();
