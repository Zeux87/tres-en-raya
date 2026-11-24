// Pantalla de Reversi: tablero, turnos (con pases), marcador y modos.
// Contra el móvil juegas con negras (N), que empiezan. Con otro móvil, los colores
// se turnan en cada partida.
(function () {
  'use strict';

  var R = window.Reversi;
  var P = window.Plataforma;

  var almacen = P.almacen('reversi');
  var partida = P.partida('reversi');
  var datos = P.ajustes(almacen.leer('v1', null), ['facil', 'normal', 'dificil'], 'normal');

  var tablero, turno, terminada, ultima = -1, ficha = 0, pensando = false;
  var casillas = [];
  var el = { tablero: document.getElementById('tablero'), estado: document.getElementById('estado') };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'N', color: 'var(--negra)', colorTexto: 'var(--texto)', punto: true },
    { id: 'E', nombre: 'Empates' },
    { id: 'B', color: 'var(--blanca)', colorTexto: 'var(--texto)', punto: true }
  ]);
  var modos = P.segmentos(document.getElementById('modos'), datos.modo, function (m) {
    if (m === 'cerca') return entrarCerca();
    salirCerca();
    datos.modo = m;
    cambiarAjustes();
  });
  var dificultades = P.segmentos(document.getElementById('dificultades'), datos.dificultad, function (d) {
    datos.dificultad = d;
    cambiarAjustes();
  });

  // ---------- Persistencia ----------
  function guardar() { almacen.escribir('v1', datos); }
  function claveMarcador() { return datos.modo === 'dos' ? 'dos' : 'movil-' + datos.dificultad; }
  function marcador() {
    if (red) return red.marcador;
    return P.marcadorDe(datos.marcadores, claveMarcador(), ['N', 'B', 'E']);
  }
  function guardarPartida() {
    if (red) return;
    if (terminada) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), tablero: tablero, turno: turno });
  }

  function contraMovil() { return !red && datos.modo === 'movil'; }
  function esMio(f) {
    if (red) return f === red.yo;
    if (contraMovil()) return f === 'N';
    return true;
  }
  function nombre(f) {
    if (red) return f === red.yo ? 'Tú' : red.rival;
    if (contraMovil()) return f === 'N' ? 'Tú' : 'El móvil';
    return f === 'N' ? 'Negras' : 'Blancas';
  }

  // ---------- Pintado ----------
  function crearTablero() {
    el.tablero.innerHTML = '';
    casillas = [];
    for (var i = 0; i < R.TOTAL; i++) {
      var c = document.createElement('div');
      c.className = 'casilla';
      c.setAttribute('data-i', String(i));
      el.tablero.appendChild(c);
      casillas.push(c);
    }
  }

  function pintarTablero(nuevas, giradas) {
    var posibles = !terminada && !pensando && esMio(turno) ? R.jugadas(tablero, turno) : [];
    for (var i = 0; i < R.TOTAL; i++) {
      var c = casillas[i];
      var f = c.firstChild;
      if (tablero[i]) {
        if (!f) { f = document.createElement('div'); c.appendChild(f); }
        f.className = 'ficha ' + tablero[i] + (nuevas === i ? ' nueva' : '') + (giradas && giradas.indexOf(i) >= 0 ? ' gira' : '');
      } else if (f) {
        c.removeChild(f);
      }
      c.classList.toggle('posible', posibles.indexOf(i) >= 0);
      c.classList.toggle('ultima', i === ultima);
    }
  }

  function pintarAjustes() {
    modos.poner(sala ? 'cerca' : datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    mc.nombres({ N: nombre('N'), B: nombre('B') });
  }

  function pintarEstado(texto) {
    var c = R.cuenta(tablero);
    var cuenta = '⚫ ' + c.N + '  ·  ⚪ ' + c.B;
    if (!texto) {
      if (red) texto = turno === red.yo ? 'Te toca' : 'Turno de ' + red.rival + '…';
      else if (contraMovil()) texto = turno === 'N' ? 'Te toca' : 'El móvil está pensando…';
      else texto = 'Turno de ' + (turno === 'N' ? 'negras' : 'blancas');
    }
    el.estado.textContent = cuenta + '   —   ' + texto;
    mc.turno(terminada ? null : turno);
  }

  // ---------- Juego ----------
  function nuevaPartida(colorAnfitrion) {
    ficha++;
    tablero = R.nuevo();
    turno = 'N';
    terminada = false;
    pensando = false;
    ultima = -1;
    colaRed = [];
    if (red) {
      if (colorAnfitrion === undefined) {
        // Este móvil crea la partida: cambia de color cada vez
        red.yo = red.partidas % 2 === 0 ? 'N' : 'B';
        sala.enviar({ t: 'nueva', anfitrion: red.yo });
      } else {
        red.yo = R.rival(colorAnfitrion);
      }
      red.partidas++;
    } else {
      partida.borrar();
    }
    empezar();
  }

  function empezar() {
    crearTablero();
    pintarAjustes();
    pintarTablero();
    pintarEstado();
    mc.pintar(marcador());
    if (contraMovil() && turno === 'B') turnoMovil();
  }

  function recuperar() {
    var g = partida.cargar();
    if (!g || g.clave !== claveMarcador() || !R.valido(g.tablero) || (g.turno !== 'N' && g.turno !== 'B')) return false;
    if (!R.jugadas(g.tablero, g.turno).length) return false;
    ficha++;
    tablero = g.tablero;
    turno = g.turno;
    terminada = false;
    pensando = false;
    ultima = -1;
    empezar();
    return true;
  }

  el.tablero.addEventListener('click', function (e) {
    if (terminada || pensando || !esMio(turno)) return;
    var c = e.target.closest ? e.target.closest('.casilla') : null;
    if (!c) return;
    var i = parseInt(c.getAttribute('data-i'), 10);
    if (!R.volteos(tablero, i, turno).length) {
      P.vibrar(30);
      return;
    }
    if (red) sala.enviar({ t: 'jugada', i: i });
    jugar(i);
  });

  function jugar(i) {
    var f = turno;
    var v = R.poner(tablero, i, f);
    if (!v.length) return;
    ultima = i;
    P.vibrar(12);
    var sig = R.siguiente(tablero, f);
    if (!sig) {
      pintarTablero(i, v);
      return fin();
    }
    var pasa = sig === f;
    turno = sig;
    guardarPartida();
    pintarTablero(i, v);
    if (pasa) {
      var quien = nombre(R.rival(f));
      pintarEstado(quien === 'Tú' ? 'No puedes mover: pasas' : quien + ' no puede mover: pasa');
      P.vibrar(40);
    } else {
      pintarEstado();
    }
    if (contraMovil() && turno === 'B') turnoMovil();
    setTimeout(jugadaRed, 0);
  }

  function turnoMovil() {
    var mia = ficha;
    pensando = true;
    pintarTablero();
    setTimeout(function () {
      if (mia !== ficha || terminada) return;
      var i = R.jugadaMovil(tablero, 'B', datos.dificultad);
      pensando = false;
      if (i >= 0) jugar(i);
    }, 550);
  }

  function fin() {
    terminada = true;
    pensando = false;
    var r = R.resultado(tablero) || { ganador: null };
    var m = marcador();
    var lado = r.ganador || 'E';
    m[lado]++;
    var texto;
    if (!r.ganador) texto = 'Empate';
    else if (red) texto = r.ganador === red.yo ? '¡Has ganado! 🎉' : 'Gana ' + red.rival;
    else if (contraMovil()) texto = r.ganador === 'N' ? '¡Has ganado! 🎉' : 'Gana el móvil';
    else texto = '¡Ganan las ' + (r.ganador === 'N' ? 'negras' : 'blancas') + '! 🎉';
    guardar();
    if (!red) partida.borrar();
    pintarTablero();
    pintarEstado(texto);
    mc.pintar(m);
    mc.saltar(lado);
    P.vibrar(r.ganador && esMio(r.ganador) ? 220 : 90);
  }

  function cambiarAjustes() {
    guardar();
    if (!recuperar()) nuevaPartida();
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // Mensajes: { t: 'nueva', anfitrion: 'N'|'B' } (color de quien la crea) y { t: 'jugada', i }
  var sala = null, red = null, colaRed = [];

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'reversi',
      alConectar: function (info) {
        red = { yo: info.anfitrion ? 'N' : 'B', rival: info.rival, marcador: { N: 0, B: 0, E: 0 }, partidas: 0, anfitrion: info.anfitrion };
        if (info.anfitrion) nuevaPartida();
        else {
          ficha++;
          tablero = R.nuevo();
          turno = 'N';
          terminada = true;
          empezar();
          pintarEstado('Conectado con ' + red.rival + '…');
        }
      },
      alMensaje: function (m) {
        if (!red || !m) return;
        if (m.t === 'pedir' && red.anfitrion) nuevaPartida();
        else if (m.t === 'nueva' && (m.anfitrion === 'N' || m.anfitrion === 'B')) nuevaPartida(m.anfitrion);
        else if (m.t === 'jugada' && m.i >= 0 && m.i < R.TOTAL) {
          colaRed.push(m.i);
          jugadaRed();
        }
      },
      alCerrar: function () {
        var habia = !!red;
        sala = null;
        red = null;
        modos.poner(datos.modo);
        if (!habia) return pintarAjustes();
        if (!recuperar()) nuevaPartida();
      }
    });
  }

  function salirCerca() {
    if (sala) sala.cerrar();
    sala = null;
    red = null;
  }

  function jugadaRed() {
    if (!red || terminada || turno === red.yo || !colaRed.length) return;
    jugar(colaRed.shift());
  }

  document.getElementById('nueva').addEventListener('click', function () {
    // Con otro móvil, solo el que creó la partida empieza otra (así no se cruzan)
    if (red && !red.anfitrion) {
      sala.enviar({ t: 'pedir' });
      pintarEstado('Has pedido otra partida a ' + red.rival);
      return;
    }
    nuevaPartida();
  });
  document.getElementById('borrar').addEventListener('click', function () {
    if (red) red.marcador = { N: 0, B: 0, E: 0 };
    else {
      datos.marcadores[claveMarcador()] = { N: 0, B: 0, E: 0 };
      guardar();
    }
    mc.pintar(marcador());
  });

  if (!recuperar()) nuevaPartida();
})();
