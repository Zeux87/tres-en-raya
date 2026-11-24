// Pantalla de Puntos y cajas: rejilla en SVG, tocar cerca de una raya para trazarla.
// Contra el móvil juegas con rojo (A) y empiezas tú.
(function () {
  'use strict';

  var C = window.Cajas;
  var P = window.Plataforma;
  var NS = 'http://www.w3.org/2000/svg';
  var TAM = 5, S = 60, M = 18;

  var almacen = P.almacen('cajas');
  var partida = P.partida('cajas');
  var datos = P.ajustes(almacen.leer('v1', null), ['facil', 'normal', 'dificil'], 'normal');

  var e, terminada, ficha = 0, pensando = false, ultima = -1, empiezaA = true;
  var rayas = [], cajasSvg = [], iniciales = [];
  var el = { tablero: document.getElementById('tablero'), estado: document.getElementById('estado') };

  var mc = P.marcador(document.getElementById('marcador'), [
    { id: 'A', color: 'var(--x)', punto: true },
    { id: 'E', nombre: 'Empates' },
    { id: 'B', color: 'var(--o)', punto: true }
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

  function guardar() { almacen.escribir('v1', datos); }
  function claveMarcador() { return datos.modo === 'dos' ? 'dos' : 'movil-' + datos.dificultad; }
  function marcador() {
    if (red) return red.marcador;
    return P.marcadorDe(datos.marcadores, claveMarcador(), ['A', 'B', 'E']);
  }
  function guardarPartida() {
    if (red) return;
    if (terminada) return partida.borrar();
    partida.guardar({ clave: claveMarcador(), estado: e, empiezaA: empiezaA });
  }

  function contraMovil() { return !red && datos.modo === 'movil'; }
  function esMio(f) {
    if (red) return f === red.yo;
    if (contraMovil()) return f === 'A';
    return true;
  }
  function nombre(f) {
    if (red) return f === red.yo ? 'Tú' : red.rival;
    if (contraMovil()) return f === 'A' ? 'Tú' : 'El móvil';
    return f === 'A' ? 'Rojo' : 'Verde';
  }

  // ---------- Dibujo ----------
  function punto(r, c) { return [M + c * S, M + r * S]; }
  function extremos(l) {
    var n = e.n, H = C.horizontales(n);
    if (l < H) {
      var r = Math.floor(l / n), c = l % n;
      return [punto(r, c), punto(r, c + 1)];
    }
    var k = l - H, rv = Math.floor(k / (n + 1)), cv = k % (n + 1);
    return [punto(rv, cv), punto(rv + 1, cv)];
  }
  function svg(tipo, attrs) {
    var x = document.createElementNS(NS, tipo);
    for (var k in attrs) x.setAttribute(k, attrs[k]);
    return x;
  }

  function crearTablero() {
    var n = e.n, lado = 2 * M + n * S;
    el.tablero.setAttribute('viewBox', '0 0 ' + lado + ' ' + lado);
    el.tablero.innerHTML = '';
    cajasSvg = [];
    iniciales = [];
    rayas = [];
    for (var k = 0; k < n * n; k++) {
      var p = punto(Math.floor(k / n), k % n);
      var cj = svg('rect', { x: p[0] + 4, y: p[1] + 4, width: S - 8, height: S - 8, rx: 6, 'class': 'caja' });
      var t = svg('text', { x: p[0] + S / 2, y: p[1] + S / 2, 'class': 'inicial' });
      el.tablero.appendChild(cj);
      el.tablero.appendChild(t);
      cajasSvg.push(cj);
      iniciales.push(t);
    }
    for (var l = 0; l < C.total(n); l++) {
      var x = extremos(l);
      var ln = svg('line', { x1: x[0][0], y1: x[0][1], x2: x[1][0], y2: x[1][1], 'class': 'raya' });
      el.tablero.appendChild(ln);
      rayas.push(ln);
    }
    for (var r = 0; r <= n; r++) {
      for (var c = 0; c <= n; c++) {
        var q = punto(r, c);
        el.tablero.appendChild(svg('circle', { cx: q[0], cy: q[1], r: 5.5, 'class': 'punto' }));
      }
    }
  }

  function inicial(f) {
    var n = nombre(f);
    if (n === 'Tú') return 'Tú';
    if (n === 'El móvil') return '📱';
    return n.charAt(0).toUpperCase();
  }

  function pintarTablero() {
    e.lineas.forEach(function (x, l) {
      rayas[l].setAttribute('class', 'raya' + (x ? ' ' + x : '') + (l === ultima ? ' nueva' : ''));
    });
    e.cajas.forEach(function (x, k) {
      cajasSvg[k].setAttribute('class', 'caja' + (x ? ' ' + x : ''));
      iniciales[k].setAttribute('class', 'inicial' + (x ? ' ' + x : ''));
      iniciales[k].textContent = x ? inicial(x) : '';
    });
  }

  function pintarAjustes() {
    modos.poner(sala ? 'cerca' : datos.modo);
    dificultades.poner(datos.dificultad);
    dificultades.ver(contraMovil());
    mc.nombres({ A: nombre('A'), B: nombre('B') });
  }

  function pintarEstado(texto) {
    var c = C.cuenta(e);
    if (!texto) {
      if (red) texto = e.turno === red.yo ? 'Te toca' : 'Turno de ' + red.rival + '…';
      else if (contraMovil()) texto = e.turno === 'A' ? 'Te toca' : 'El móvil está pensando…';
      else texto = 'Turno de ' + nombre(e.turno).toLowerCase();
    }
    el.estado.textContent = 'Cajas ' + c.A + ' – ' + c.B + '   —   ' + texto;
    mc.turno(terminada ? null : e.turno);
  }

  // ---------- Juego ----------
  function nuevaPartida(empieza) {
    ficha++;
    if (red && empieza === undefined) {
      empieza = empiezaA ? 'A' : 'B';
      sala.enviar({ t: 'nueva', turno: empieza });
    }
    if (empieza !== 'A' && empieza !== 'B') empieza = empiezaA ? 'A' : 'B';
    empiezaA = empieza !== 'A'; // la próxima empieza el otro
    e = C.nuevo(TAM, empieza);
    terminada = false;
    pensando = false;
    ultima = -1;
    colaRed = [];
    if (!red) partida.borrar();
    empezar();
  }

  function empezar() {
    crearTablero();
    pintarAjustes();
    pintarTablero();
    pintarEstado();
    mc.pintar(marcador());
    if (contraMovil() && e.turno === 'B') turnoMovil();
  }

  function recuperar() {
    var g = partida.cargar();
    if (!g || g.clave !== claveMarcador() || !C.valido(g.estado) || C.terminada(g.estado)) return false;
    ficha++;
    e = g.estado;
    empiezaA = g.empiezaA !== false;
    terminada = false;
    pensando = false;
    ultima = -1;
    empezar();
    return true;
  }

  // Raya libre más cercana al punto tocado
  function rayaEn(ev) {
    var caja = el.tablero.getBoundingClientRect();
    var lado = 2 * M + e.n * S;
    var x = (ev.clientX - caja.left) * lado / caja.width, y = (ev.clientY - caja.top) * lado / caja.height;
    var mejor = -1, min = S * 0.42;
    e.lineas.forEach(function (ocupada, l) {
      if (ocupada) return;
      var p = extremos(l);
      var mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2;
      var horizontal = p[0][1] === p[1][1];
      // Distancia "en caja": a lo largo de la raya cuenta menos
      var d = horizontal ? Math.max(Math.abs(x - mx) - S * 0.3, 0) + Math.abs(y - my) : Math.abs(x - mx) + Math.max(Math.abs(y - my) - S * 0.3, 0);
      if (d < min) { min = d; mejor = l; }
    });
    return mejor;
  }

  el.tablero.addEventListener('click', function (ev) {
    if (terminada || pensando || !esMio(e.turno)) return;
    var l = rayaEn(ev);
    if (l < 0) return;
    if (red) sala.enviar({ t: 'jugada', l: l });
    jugar(l);
  });

  function jugar(l) {
    var quien = e.turno;
    var cerradas = C.jugar(e, l);
    if (!cerradas) return;
    ultima = l;
    P.vibrar(cerradas.length ? 40 : 10);
    if (C.terminada(e)) {
      pintarTablero();
      return fin();
    }
    guardarPartida();
    pintarTablero();
    if (cerradas.length) {
      var n = nombre(quien);
      pintarEstado(n === 'Tú' ? '¡Caja! Vuelves a jugar' : '¡Caja para ' + (red ? n : n.toLowerCase()) + '!');
    } else {
      pintarEstado();
    }
    if (contraMovil() && e.turno === 'B') turnoMovil();
    setTimeout(jugadaRed, 0);
  }

  function turnoMovil() {
    var mia = ficha;
    pensando = true;
    setTimeout(function () {
      if (mia !== ficha || terminada) return;
      var l = C.jugadaMovil(e, datos.dificultad);
      pensando = false;
      if (l >= 0) jugar(l);
    }, 450);
  }

  function fin() {
    terminada = true;
    pensando = false;
    var r = C.resultado(e);
    var lado = r.ganador || 'E';
    var m = marcador();
    m[lado]++;
    var texto;
    if (!r.ganador) texto = 'Empate';
    else if (red) texto = r.ganador === red.yo ? '¡Has ganado! 🎉' : 'Gana ' + red.rival;
    else if (contraMovil()) texto = r.ganador === 'A' ? '¡Has ganado! 🎉' : 'Gana el móvil';
    else texto = '¡Gana ' + nombre(r.ganador).toLowerCase() + '! 🎉';
    guardar();
    if (!red) partida.borrar();
    pintarEstado(texto);
    mc.pintar(m);
    mc.saltar(lado);
    P.vibrar(r.ganador && esMio(r.ganador) ? 220 : 90);
  }

  function cambiarAjustes() {
    guardar();
    if (!recuperar()) { empiezaA = true; nuevaPartida(); }
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // El que crea la partida es rojo (A). Mensajes: { t: 'nueva', turno }, { t: 'jugada', l }, { t: 'pedir' }
  var sala = null, red = null, colaRed = [];

  function entrarCerca() {
    sala = Cerca.abrir({
      juego: 'cajas',
      alConectar: function (info) {
        red = { yo: info.anfitrion ? 'A' : 'B', rival: info.rival, marcador: { A: 0, B: 0, E: 0 }, anfitrion: info.anfitrion };
        empiezaA = true;
        if (info.anfitrion) nuevaPartida();
        else {
          ficha++;
          e = C.nuevo(TAM, 'A');
          terminada = true;
          empezar();
          pintarEstado('Conectado con ' + red.rival + '…');
        }
      },
      alMensaje: function (m) {
        if (!red || !m) return;
        if (m.t === 'pedir' && red.anfitrion) nuevaPartida();
        else if (m.t === 'nueva' && (m.turno === 'A' || m.turno === 'B')) nuevaPartida(m.turno);
        else if (m.t === 'jugada' && m.l >= 0) {
          colaRed.push(m.l);
          jugadaRed();
        }
      },
      alCerrar: function () {
        var habia = !!red;
        sala = null;
        red = null;
        modos.poner(datos.modo);
        if (!habia) return pintarAjustes();
        empiezaA = true;
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
    jugar(colaRed.shift());
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
    if (red) red.marcador = { A: 0, B: 0, E: 0 };
    else {
      datos.marcadores[claveMarcador()] = { A: 0, B: 0, E: 0 };
      guardar();
    }
    mc.pintar(marcador());
  });

  if (!recuperar()) nuevaPartida();
})();
