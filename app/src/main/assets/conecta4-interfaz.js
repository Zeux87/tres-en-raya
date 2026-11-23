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
  function marcador() { return P.marcadorDe(datos.marcadores, claveMarcador(), ['R', 'A', 'E']); }

  // La partida a medias se guarda tras cada jugada y se borra al terminar
  function guardarPartida() {
    if (terminada) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), tablero: tablero, turno: turno, empiezaR: empiezaR });
  }

  // ---------- Utilidades ----------
  function contraMovil() { return datos.modo === 'movil'; }
  function nombre(f) {
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
    modos.poner(datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    mc.nombres(contraMovil() ? { R: 'Tú', A: 'Móvil' } : { R: 'Rojas', A: 'Amarillas' });
  }

  function pintarMarcador() { mc.pintar(marcador()); }

  function pintarTurno() {
    mc.turno(terminada ? null : turno);
    document.documentElement.style.setProperty('--color-turno', turno === 'R' ? 'var(--rojo)' : 'var(--amarillo)');
    var texto;
    if (contraMovil()) texto = turno === 'R' ? 'Te toca: toca una columna' : 'El móvil está pensando…';
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
  function nuevaPartida() {
    ficha++; // invalida jugadas del móvil pendientes
    tablero = C.nuevo();
    terminada = false;
    ocupado = false;
    turno = empiezaR ? 'R' : 'A';
    empiezaR = !empiezaR; // la próxima empieza el otro color
    partida.borrar();
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
      guardarPartida();
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
      if (contraMovil()) texto = r.ficha === 'R' ? '¡Has ganado! 🎉' : 'Gana el móvil';
      else texto = '¡Ganan las ' + (r.ficha === 'R' ? 'rojas' : 'amarillas') + '! 🎉';
      ponerEstado(texto, 'gana-' + r.ficha);
      mc.saltar(r.ficha);
      vibrar(r.ficha === 'R' || !contraMovil() ? 220 : 90);
    }
    guardar();
    partida.borrar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  function cambiarAjustes() {
    guardar();
    empiezaR = true;
    nuevaPartida();
  }

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    datos.marcadores[claveMarcador()] = { R: 0, A: 0, E: 0 };
    guardar();
    pintarMarcador();
  });

  if (!recuperar()) nuevaPartida();
})();
