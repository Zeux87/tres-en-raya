// Pantalla de Mi juego, montada sobre la plantilla común (plataforma.js).
(function () {
  'use strict';

  var M = window.MiJuego;
  var P = window.Plataforma;

  var almacen = P.almacen('mijuego'); // ajustes y marcadores en "mijuego.v1"
  var partida = P.partida('mijuego'); // partida a medias en "mijuego.partida"
  var datos = P.ajustes(almacen.leer('v1', null), ['normal'], 'normal');

  var tablero, turno, terminada;
  var el = { tablero: document.getElementById('tablero'), estado: document.getElementById('estado') };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'A', color: 'var(--x)' },
    { id: 'E', nombre: 'Empates' },
    { id: 'B', color: 'var(--o)' }
  ]);
  var modos = P.segmentos(document.getElementById('modos'), datos.modo, function (m) {
    datos.modo = m;
    almacen.escribir('v1', datos);
    nuevaPartida();
  });

  function contraMovil() { return datos.modo === 'movil'; }
  function marcador() { return P.marcadorDe(datos.marcadores, datos.modo, ['A', 'B', 'E']); }

  function pintar() {
    modos.poner(datos.modo);
    mc.nombres(contraMovil() ? { A: 'Tú', B: 'Móvil' } : { A: 'Jugador A', B: 'Jugador B' });
    mc.pintar(marcador());
    mc.turno(terminada ? null : turno);
    el.tablero.innerHTML = '';
    tablero.forEach(function (c, i) {
      var b = document.createElement('button');
      b.textContent = c || '';
      b.addEventListener('click', function () { pulsar(i); });
      el.tablero.appendChild(b);
    });
    if (!terminada) el.estado.textContent = 'Turno de ' + turno;
  }

  function nuevaPartida() {
    tablero = M.nuevo();
    turno = 'A';
    terminada = false;
    partida.borrar();
    pintar();
  }

  function pulsar(i) {
    if (terminada || tablero[i] || (contraMovil() && turno !== 'A')) return;
    jugar(i);
    if (!terminada && contraMovil()) setTimeout(function () { jugar(M.jugadaMovil(tablero)); }, 400);
  }

  function jugar(i) {
    if (i < 0 || terminada) return;
    tablero[i] = turno;
    P.vibrar(12);
    var r = M.resultado(tablero);
    if (r) {
      terminada = true;
      var m = marcador();
      m[r === 'empate' ? 'E' : r.ganador]++;
      almacen.escribir('v1', datos);
      partida.borrar();
      el.estado.textContent = r === 'empate' ? 'Empate' : '¡Gana ' + r.ganador + '!';
      pintar();
      mc.saltar(r === 'empate' ? 'E' : r.ganador);
      return;
    }
    turno = M.rival(turno);
    partida.guardar({ modo: datos.modo, tablero: tablero, turno: turno }); // se recupera al volver
    pintar();
  }

  document.getElementById('nueva').addEventListener('click', nuevaPartida);
  document.getElementById('borrar').addEventListener('click', function () {
    datos.marcadores[datos.modo] = {};
    almacen.escribir('v1', datos);
    pintar();
  });

  // Arranque: recupera la partida a medias si es del mismo modo
  var g = partida.cargar();
  if (g && g.modo === datos.modo && Array.isArray(g.tablero)) {
    tablero = g.tablero;
    turno = g.turno;
    terminada = false;
    pintar();
    if (contraMovil() && turno === 'B') jugar(M.jugadaMovil(tablero));
  } else {
    nuevaPartida();
  }
})();
