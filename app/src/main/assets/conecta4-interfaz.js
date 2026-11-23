// Interfaz de Conecta 4: tablero, turnos, marcador y ajustes.
// En "contra el móvil" tú juegas con rojas (R) y el móvil con amarillas (A).
(function () {
  'use strict';

  var C = window.Conecta4;
  var P = window.Plataforma;

  var almacen = P.almacen('conecta4'); // ajustes y marcadores en "conecta4.v1"
  var partida = P.partida('conecta4'); // partida a medias en "conecta4.partida"
  var datos = P.ajustes(almacen.leer('v1', null), ['facil', 'normal', 'dificil'], 'normal');

  var tablero, turno, terminada, ocupado, empiezaR = true, ficha = 0;
  var huecos = [];

  var el = {
    tablero: document.getElementById('tablero'),
    flechas: document.getElementById('flechas'),
    estado: document.getElementById('estado')
  };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'R', color: 'var(--rojo)', punto: true },
    { id: 'E', nombre: 'Empates' },
    { id: 'A', color: 'var(--amarillo)', colorTexto: 'var(--amarillo-texto)', punto: true }
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
    if (red) return red.marcador; // con otro móvil: marcador solo de esta conexión
    return P.marcadorDe(datos.marcadores, claveMarcador(), ['R', 'A', 'E']);
  }

  // La partida a medias se guarda tras cada jugada y se borra al terminar
  // (con otro móvil no se guarda: al volver ya no hay conexión)
  function guardarPartida() {
    if (red) return;
    if (terminada) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), tablero: tablero, turno: turno, empiezaR: empiezaR });
  }

  // ---------- Utilidades ----------
  function contraMovil() { return !red && datos.modo === 'movil'; }
  function nombre(f) {
    if (red) return f === red.yo ? 'Tú' : red.rival;
    if (contraMovil()) return f === 'R' ? 'Tú' : 'El móvil';
    return f === 'R' ? 'Rojas' : 'Amarillas';
  }
  var vibrar = P.vibrar;

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
    modos.poner(sala ? 'cerca' : datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    if (red) mc.nombres({ R: nombre('R'), A: nombre('A') });
    else mc.nombres(contraMovil() ? { R: 'Tú', A: 'Móvil' } : { R: 'Rojas', A: 'Amarillas' });
  }

  function pintarMarcador() { mc.pintar(marcador()); }

  function pintarTurno() {
    mc.turno(terminada ? null : turno);
    document.documentElement.style.setProperty('--color-turno', turno === 'R' ? 'var(--rojo)' : 'var(--amarillo)');
    var texto;
    if (red) texto = turno === red.yo ? 'Te toca: toca una columna' : 'Turno de ' + red.rival + '…';
    else if (contraMovil()) texto = turno === 'R' ? 'Te toca: toca una columna' : 'El móvil está pensando…';
    else texto = 'Turno de ' + (turno === 'R' ? 'rojas' : 'amarillas');
    ponerEstado(texto);
  }

  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = 'estado' + (clase ? ' ' + clase : '');
  }

  function marcarFlecha(col) {
    var fs = el.flechas.children;
    for (var i = 0; i < fs.length; i++) fs[i].classList.toggle('ver', i === col);
  }

  // ---------- Juego ----------
  // "primero": quién empieza (solo con otro móvil, cuando lo decide el otro)
  function nuevaPartida(primero) {
    ficha++; // invalida jugadas del móvil pendientes
    tablero = C.nuevo();
    terminada = false;
    ocupado = false;
    colaRed = [];
    turno = primero === 'R' || primero === 'A' ? primero : (empiezaR ? 'R' : 'A');
    empiezaR = turno !== 'R'; // la próxima empieza el otro color
    // Con otro móvil, si la empieza este, avisa al otro de quién sale
    if (red && primero === undefined) sala.enviar({ t: 'nueva', turno: turno });
    if (!red) partida.borrar();
    empezar();
  }

  // Pinta la partida actual (nueva o recuperada) y, si le toca, juega el móvil
  function empezar() {
    crearTablero();
    for (var i = 0; i < C.TOTAL; i++) {
      if (!tablero[i]) continue;
      var f = document.createElement('div');
      f.className = 'ficha ' + tablero[i];
      huecos[i].appendChild(f);
    }
    pintarAjustes();
    pintarMarcador();
    pintarTurno();
    if (contraMovil() && turno === 'A') turnoMovil();
  }

  // Recupera la partida a medias si es del modo y dificultad actuales
  function recuperar() {
    var g = partida.cargar();
    if (!g || g.clave !== claveMarcador() || !Array.isArray(g.tablero) || g.tablero.length !== C.TOTAL) return false;
    if (g.turno !== 'R' && g.turno !== 'A') return false;
    if (!C.columnasLibres(g.tablero).length) return false;
    ficha++;
    tablero = g.tablero;
    turno = g.turno;
    empiezaR = g.empiezaR !== false;
    terminada = false;
    ocupado = false;
    empezar();
    return true;
  }

  function puedeTocar() {
    return !terminada && !ocupado && !(contraMovil() && turno === 'A') && !(red && turno !== red.yo);
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
    if (red) sala.enviar({ t: 'jugada', col: col });
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
      guardarPartida();
      marcarFlecha(-1);
      pintarTurno();
      if (despues) despues();
      jugadaRed();
    }
    f.addEventListener('animationend', alCaer);
    setTimeout(alCaer, 700); // por si la animación no avisa
  }

  function finPartida(r) {
    terminada = true;
    ocupado = false;
    marcarFlecha(-1);
    mc.turno(null);
    var m = marcador();
    if (r === 'empate') {
      m.E++;
      ponerEstado('Empate: tablero lleno');
      mc.saltar('E');
      vibrar(60);
    } else {
      m[r.ficha]++;
      el.tablero.classList.add('terminado');
      r.linea.forEach(function (c) {
        var fi = huecos[c].querySelector('.ficha');
        if (fi) fi.classList.add('ganadora');
      });
      var texto;
      if (red) texto = r.ficha === red.yo ? '¡Has ganado! 🎉' : 'Gana ' + red.rival;
      else if (contraMovil()) texto = r.ficha === 'R' ? '¡Has ganado! 🎉' : 'Gana el móvil';
      else texto = '¡Ganan las ' + (r.ficha === 'R' ? 'rojas' : 'amarillas') + '! 🎉';
      ponerEstado(texto, 'gana-' + r.ficha);
      mc.saltar(r.ficha);
      var gano = red ? r.ficha === red.yo : (r.ficha === 'R' || !contraMovil());
      vibrar(gano ? 220 : 90);
    }
    guardar();
    if (!red) partida.borrar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  function cambiarAjustes() {
    guardar();
    empiezaR = true;
    nuevaPartida();
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // El que crea la partida juega con rojas y el que se une con amarillas.
  // Mensajes: { t: 'nueva', turno } y { t: 'jugada', col }
  var sala = null, red = null, colaRed = [];

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'conecta4',
      alConectar: function (info) {
        red = { yo: info.anfitrion ? 'R' : 'A', rival: info.rival, marcador: { R: 0, A: 0, E: 0 } };
        empiezaR = true;
        if (info.anfitrion) nuevaPartida();
        else {
          // Espera a que el otro diga quién empieza
          ficha++;
          tablero = C.nuevo();
          terminada = true;
          empezar();
          ponerEstado('Conectado con ' + red.rival + '…');
        }
      },
      alMensaje: function (m) {
        if (!red || !m) return;
        if (m.t === 'nueva' && (m.turno === 'R' || m.turno === 'A')) nuevaPartida(m.turno);
        else if (m.t === 'jugada' && m.col >= 0 && m.col < C.COLS) {
          colaRed.push(m.col);
          jugadaRed();
        }
      },
      alCerrar: function () {
        var habia = !!red;
        sala = null;
        red = null;
        modos.poner(datos.modo);
        if (!habia) return pintarAjustes();
        // Vuelve al modo de antes, con su partida a medias si la había
        empiezaR = true;
        if (!recuperar()) nuevaPartida();
      }
    });
  }

  function salirCerca() {
    if (sala) sala.cerrar();
    sala = null;
    red = null;
  }

  // Juega la ficha del otro móvil cuando acaba la animación de la anterior
  function jugadaRed() {
    if (!red || ocupado || terminada || turno === red.yo || !colaRed.length) return;
    jugar(colaRed.shift());
  }

  document.getElementById('nueva').addEventListener('click', function () { nuevaPartida(); });

  document.getElementById('borrar').addEventListener('click', function () {
    if (red) {
      red.marcador = { R: 0, A: 0, E: 0 };
      pintarMarcador();
      return;
    }
    datos.marcadores[claveMarcador()] = { R: 0, A: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  if (!recuperar()) nuevaPartida();
})();
