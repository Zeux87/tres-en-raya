// Interfaz del 3 en raya: dibuja el tablero, gestiona turnos, marcador y ajustes.
(function () {
  'use strict';

  var T = window.TresEnRaya;
  var P = window.Plataforma;
  var SVG = 'http://www.w3.org/2000/svg';

  var almacen = P.almacen('tresenraya'); // ajustes y marcadores en "tresenraya.v1"
  var partida = P.partida('tresenraya'); // partida a medias en "tresenraya.partida"
  var datos = P.ajustes(almacen.leer('v1', null), ['facil', 'normal', 'imposible'], 'normal');

  var tablero, turno, terminada, empiezaX = true, ficha = 0;

  var el = {
    tablero: document.getElementById('tablero'),
    linea: document.getElementById('linea'),
    estado: document.getElementById('estado')
  };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'X', color: 'var(--x)' },
    { id: 'E', nombre: 'Empates' },
    { id: 'O', color: 'var(--o)' }
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
  function claveMarcador() {
    return datos.modo === 'dos' ? 'dos' : 'movil-' + datos.dificultad;
  }
  function marcador() {
    if (red) return red.marcador; // con otro móvil: marcador solo de esta conexión
    return P.marcadorDe(datos.marcadores, claveMarcador(), ['X', 'O', 'E']);
  }

  // La partida a medias se guarda tras cada jugada y se borra al terminar
  // (con otro móvil no se guarda: al volver ya no hay conexión)
  function guardarPartida() {
    if (red) return;
    if (terminada || tablero.every(function (c) { return !c; })) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), tablero: tablero, turno: turno, empiezaX: empiezaX });
  }

  // ---------- Utilidades ----------
  function contraMovil() { return !red && datos.modo === 'movil'; }
  var vibrar = P.vibrar;

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
    modos.poner(sala ? 'cerca' : datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    if (red) {
      var n = {};
      n[red.yo] = 'Tú (' + red.yo + ')';
      n[T.rival(red.yo)] = red.rival + ' (' + T.rival(red.yo) + ')';
      mc.nombres(n);
    } else {
      mc.nombres(contraMovil() ? { X: 'Tú (X)', O: 'Móvil (O)' } : { X: 'Jugador X', O: 'Jugador O' });
    }
  }

  function pintarMarcador() { mc.pintar(marcador()); }

  function pintarTurno() { mc.turno(terminada ? null : turno); }

  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = 'estado' + (clase ? ' ' + clase : '');
  }

  function textoTurno() {
    if (red) return turno === red.yo ? 'Te toca' : 'Turno de ' + red.rival + '…';
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

  // ---------- Juego ----------
  // "primero": quién empieza (solo con otro móvil, cuando lo decide el otro)
  function nuevaPartida(primero) {
    ficha++; // invalida jugadas del móvil pendientes
    tablero = [null, null, null, null, null, null, null, null, null];
    terminada = false;
    turno = primero === 'X' || primero === 'O' ? primero : (empiezaX ? 'X' : 'O');
    empiezaX = turno !== 'X'; // la siguiente partida empieza el otro
    // Con otro móvil, si la empieza este, avisa al otro de quién sale
    if (red && primero === undefined) sala.enviar({ t: 'nueva', turno: turno });
    if (!red) partida.borrar();
    empezar();
  }

  // Pinta la partida actual (nueva o recuperada) y, si le toca, juega el móvil
  function empezar() {
    crearTablero();
    for (var i = 0; i < 9; i++) {
      if (!tablero[i]) continue;
      el.tablero.children[i].classList.add('ocupada');
      el.tablero.children[i].appendChild(dibujoFicha(tablero[i]));
    }
    pintarAjustes();
    pintarMarcador();
    pintarTurno();
    ponerEstado(textoTurno());
    if (contraMovil() && turno === 'O') turnoMovil();
  }

  // Recupera la partida a medias si es del modo y dificultad actuales
  function recuperar() {
    var g = partida.cargar();
    if (!g || g.clave !== claveMarcador() || !Array.isArray(g.tablero) || g.tablero.length !== 9) return false;
    if (g.turno !== 'X' && g.turno !== 'O') return false;
    if (T.resultado(g.tablero)) return false;
    ficha++;
    tablero = g.tablero;
    turno = g.turno;
    empiezaX = g.empiezaX !== false;
    terminada = false;
    empezar();
    return true;
  }

  function pulsar(i) {
    if (terminada || tablero[i]) return;
    if (contraMovil() && turno !== 'X') return;
    if (red && turno !== red.yo) return;
    if (red) sala.enviar({ t: 'jugada', i: i });
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
    guardarPartida();
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
      mc.saltar('E');
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
      if (red) texto = r.ficha === red.yo ? '¡Has ganado! 🎉' : 'Gana ' + red.rival;
      else if (contraMovil()) texto = r.ficha === 'X' ? '¡Has ganado! 🎉' : 'Gana el móvil';
      else texto = '¡Gana ' + r.ficha + '! 🎉';
      ponerEstado(texto, r.ficha === 'X' ? 'gana-x' : 'gana-o');
      mc.saltar(r.ficha);
      var gano = red ? r.ficha === red.yo : (r.ficha === 'X' || !contraMovil());
      vibrar(gano ? 180 : 90);
    }
    guardar();
    if (!red) partida.borrar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  function cambiarAjustes() {
    guardar();
    empiezaX = true;
    nuevaPartida();
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // El que crea la partida juega con X y el que se une con O.
  // Mensajes: { t: 'nueva', turno } y { t: 'jugada', i }
  var sala = null, red = null;

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'tresenraya',
      alConectar: function (info) {
        red = { yo: info.anfitrion ? 'X' : 'O', rival: info.rival, marcador: { X: 0, O: 0, E: 0 } };
        empiezaX = true;
        if (info.anfitrion) nuevaPartida();
        else {
          // Espera a que el otro diga quién empieza
          ficha++;
          tablero = [null, null, null, null, null, null, null, null, null];
          terminada = true;
          empezar();
          ponerEstado('Conectado con ' + red.rival + '…');
        }
      },
      alMensaje: function (m) {
        if (!red || !m) return;
        if (m.t === 'nueva' && (m.turno === 'X' || m.turno === 'O')) nuevaPartida(m.turno);
        else if (m.t === 'jugada' && !terminada && turno !== red.yo && m.i >= 0 && m.i < 9 && !tablero[m.i]) jugar(m.i);
      },
      alCerrar: function (motivo) {
        var habia = !!red;
        sala = null;
        red = null;
        modos.poner(datos.modo);
        if (!habia) return pintarAjustes();
        // Vuelve al modo de antes, con su partida a medias si la había
        empiezaX = true;
        if (!recuperar()) nuevaPartida();
      }
    });
  }

  function salirCerca() {
    if (sala) sala.cerrar();
    sala = null;
    red = null;
  }

  document.getElementById('nueva').addEventListener('click', function () { nuevaPartida(); });

  document.getElementById('borrar').addEventListener('click', function () {
    if (red) {
      red.marcador = { X: 0, O: 0, E: 0 };
      pintarMarcador();
      return;
    }
    datos.marcadores[claveMarcador()] = { X: 0, O: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  if (!recuperar()) nuevaPartida();
})();
