// Pantalla de las Damas: tocar una pieza y luego su destino.
// Contra el móvil juegas con blancas (abajo), que empiezan. Con otro móvil los colores
// se turnan en cada partida y cada uno ve sus piezas abajo.
(function () {
  'use strict';

  var D = window.Damas;
  var P = window.Plataforma;

  var almacen = P.almacen('damas');
  var partida = P.partida('damas');
  var datos = P.ajustes(almacen.leer('v1', null), ['facil', 'normal', 'dificil'], 'normal');

  var e, terminada, ficha = 0, pensando = false, elegida = -1, ultima = null, legales = [];
  var casillas = [];
  var el = { tablero: document.getElementById('tablero'), estado: document.getElementById('estado') };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'B', color: 'var(--blanca)', colorTexto: 'var(--texto)', punto: true },
    { id: 'E', nombre: 'Tablas' },
    { id: 'N', color: 'var(--negra)', colorTexto: 'var(--texto)', punto: true }
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
    return P.marcadorDe(datos.marcadores, claveMarcador(), ['B', 'N', 'E']);
  }
  function guardarPartida() {
    if (red) return;
    if (terminada) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), estado: e });
  }

  function contraMovil() { return !red && datos.modo === 'movil'; }
  function esMio(f) {
    if (red) return f === red.yo;
    if (contraMovil()) return f === 'B';
    return true;
  }
  function nombre(f) {
    if (red) return f === red.yo ? 'Tú' : red.rival;
    if (contraMovil()) return f === 'B' ? 'Tú' : 'El móvil';
    return f === 'B' ? 'Blancas' : 'Negras';
  }

  // ---------- Pintado ----------
  function crearTablero() {
    el.tablero.innerHTML = '';
    casillas = [];
    for (var i = 0; i < D.TOTAL; i++) {
      var c = document.createElement('div');
      var r = Math.floor(i / D.N);
      c.className = 'casilla' + ((r + i % D.N) % 2 ? ' oscura' : '');
      c.setAttribute('data-i', String(i));
      el.tablero.appendChild(c);
      casillas.push(c);
    }
  }

  function pintarTablero() {
    el.tablero.classList.toggle('girado', !!red && red.yo === 'N');
    var puedoTocar = !terminada && !pensando && esMio(e.turno);
    var origenes = puedoTocar ? legales.map(function (j) { return j.camino[0]; }) : [];
    var destinos = [], comidas = [];
    legales.forEach(function (j) {
      if (j.camino[0] !== elegida) return;
      destinos.push(j.camino[j.camino.length - 1]);
    });
    var camino = ultima ? ultima.camino : [];
    for (var i = 0; i < D.TOTAL; i++) {
      var c = casillas[i], p = e.t[i];
      c.innerHTML = '';
      if (p) {
        var f = document.createElement('div');
        f.className = 'pieza ' + p + (origenes.indexOf(i) >= 0 ? ' puede' : '') + (i === elegida ? ' elegida' : '') + (comidas.indexOf(i) >= 0 ? ' comida' : '');
        c.appendChild(f);
      }
      c.classList.toggle('destino', destinos.indexOf(i) >= 0);
      c.classList.toggle('camino', camino.indexOf(i) >= 0);
    }
  }

  function pintarAjustes() {
    modos.poner(sala ? 'cerca' : datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    mc.nombres({ B: nombre('B'), N: nombre('N') });
  }

  function pintarEstado(texto) {
    if (!texto) {
      var obliga = legales.length && legales[0].comidas.length;
      if (red) texto = e.turno === red.yo ? (obliga ? 'Te toca: ¡tienes que comer!' : 'Te toca') : 'Turno de ' + red.rival + '…';
      else if (contraMovil()) texto = e.turno === 'B' ? (obliga ? 'Te toca: ¡tienes que comer!' : 'Te toca') : 'El móvil está pensando…';
      else texto = 'Turno de ' + (e.turno === 'B' ? 'blancas' : 'negras') + (obliga ? ': ¡a comer!' : '');
    }
    el.estado.textContent = texto;
    mc.turno(terminada ? null : e.turno);
  }

  function refrescar(texto) {
    legales = terminada ? [] : D.jugadas(e.t, e.turno);
    pintarTablero();
    pintarEstado(texto);
  }

  // ---------- Juego ----------
  function nuevaPartida(colorAnfitrion) {
    ficha++;
    e = D.estadoNuevo();
    terminada = false;
    pensando = false;
    elegida = -1;
    ultima = null;
    colaRed = [];
    if (red) {
      if (colorAnfitrion === undefined) {
        red.yo = red.partidas % 2 === 0 ? 'B' : 'N';
        sala.enviar({ t: 'nueva', anfitrion: red.yo });
      } else {
        red.yo = D.rival(colorAnfitrion);
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
    refrescar();
    mc.pintar(marcador());
    if (contraMovil() && e.turno === 'N') turnoMovil();
  }

  function recuperar() {
    var g = partida.cargar();
    if (!g || g.clave !== claveMarcador() || !D.valido(g.estado) || D.resultado(g.estado)) return false;
    ficha++;
    e = g.estado;
    terminada = false;
    pensando = false;
    elegida = -1;
    ultima = null;
    empezar();
    return true;
  }

  el.tablero.addEventListener('click', function (ev) {
    if (terminada || pensando || !esMio(e.turno)) return;
    var c = ev.target.closest ? ev.target.closest('.casilla') : null;
    if (!c) return;
    var i = parseInt(c.getAttribute('data-i'), 10);
    // ¿Es destino de la pieza elegida?
    for (var k = 0; k < legales.length; k++) {
      var j = legales[k];
      if (j.camino[0] === elegida && j.camino[j.camino.length - 1] === i) {
        if (red) sala.enviar({ t: 'jugada', camino: j.camino });
        return jugar(j);
      }
    }
    if (legales.some(function (j) { return j.camino[0] === i; })) {
      elegida = elegida === i ? -1 : i;
      P.vibrar(8);
      pintarTablero();
    } else if (D.lado(e.t[i]) === e.turno) {
      elegida = -1;
      pintarTablero();
      pintarEstado(legales.length && legales[0].comidas.length ? 'Tienes que comer con otra pieza' : 'Esa pieza no puede moverse');
      P.vibrar(30);
    }
  });

  function jugar(j) {
    var corona = D.aplicar(e, j);
    elegida = -1;
    ultima = j;
    P.vibrar(j.comidas.length ? 30 : 12);
    var r = D.resultado(e);
    if (r) return fin(r);
    guardarPartida();
    refrescar(corona ? '¡Dama! 👑' : undefined);
    if (corona) setTimeout(function () { if (!terminada) pintarEstado(); }, 900);
    if (contraMovil() && e.turno === 'N') turnoMovil();
    setTimeout(jugadaRed, 0);
  }

  function turnoMovil() {
    var mia = ficha;
    pensando = true;
    refrescar();
    setTimeout(function () {
      if (mia !== ficha || terminada) return;
      var j = D.jugadaMovil(e, datos.dificultad);
      pensando = false;
      if (j) jugar(j);
    }, 500);
  }

  function fin(r) {
    terminada = true;
    pensando = false;
    var lado = r.ganador || 'E';
    var m = marcador();
    m[lado]++;
    var texto;
    if (!r.ganador) texto = 'Tablas: 50 jugadas sin comer';
    else if (red) texto = r.ganador === red.yo ? '¡Has ganado! 🎉' : 'Gana ' + red.rival;
    else if (contraMovil()) texto = r.ganador === 'B' ? '¡Has ganado! 🎉' : 'Gana el móvil';
    else texto = '¡Ganan las ' + (r.ganador === 'B' ? 'blancas' : 'negras') + '! 🎉';
    guardar();
    if (!red) partida.borrar();
    refrescar(texto);
    mc.pintar(m);
    mc.saltar(lado);
    P.vibrar(r.ganador && esMio(r.ganador) ? 220 : 90);
  }

  function cambiarAjustes() {
    guardar();
    if (!recuperar()) nuevaPartida();
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // Mensajes: { t: 'nueva', anfitrion: 'B'|'N' }, { t: 'jugada', camino: [...] } y { t: 'pedir' }
  var sala = null, red = null, colaRed = [];

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'damas',
      alConectar: function (info) {
        red = { yo: info.anfitrion ? 'B' : 'N', rival: info.rival, marcador: { B: 0, N: 0, E: 0 }, partidas: 0, anfitrion: info.anfitrion };
        if (info.anfitrion) nuevaPartida();
        else {
          ficha++;
          e = D.estadoNuevo();
          terminada = true;
          empezar();
          pintarEstado('Conectado con ' + red.rival + '…');
        }
      },
      alMensaje: function (m) {
        if (!red || !m) return;
        if (m.t === 'pedir' && red.anfitrion) nuevaPartida();
        else if (m.t === 'nueva' && (m.anfitrion === 'B' || m.anfitrion === 'N')) nuevaPartida(m.anfitrion);
        else if (m.t === 'jugada' && Array.isArray(m.camino)) {
          colaRed.push(m.camino);
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
    if (!red || terminada || e.turno === red.yo || !colaRed.length) return;
    var j = D.buscar(e.t, e.turno, colaRed.shift());
    if (j) jugar(j);
  }

  document.getElementById('nueva').addEventListener('click', function () {
    if (red && !red.anfitrion) {
      sala.enviar({ t: 'pedir' });
      pintarEstado('Has pedido otra partida a ' + red.rival);
      return;
    }
    nuevaPartida();
  });
  document.getElementById('borrar').addEventListener('click', function () {
    if (red) red.marcador = { B: 0, N: 0, E: 0 };
    else {
      datos.marcadores[claveMarcador()] = { B: 0, N: 0, E: 0 };
      guardar();
    }
    mc.pintar(marcador());
  });

  if (!recuperar()) nuevaPartida();
})();
