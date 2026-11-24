// Pantalla del Solitario: mesa con cartas colocadas a mano (posiciones absolutas),
// tocar para mandar una carta a su mejor sitio o arrastrarla a donde quieras.
(function () {
  'use strict';

  var S = window.Solitario;
  var P = window.Plataforma;

  var almacen = P.almacen('solitario');
  var partida = P.partida('solitario');
  var datos = almacen.leer('v1', null);
  if (!datos || typeof datos !== 'object') datos = {};
  if (datos.robar !== 1 && datos.robar !== 3) datos.robar = 1;
  if (!datos.ganadas || typeof datos.ganadas !== 'object') datos.ganadas = {};
  if (!datos.mejor || typeof datos.mejor !== 'object') datos.mejor = {};

  var e = null, segundos = 0, historial = [], terminada = false, reloj = null, acabando = null;
  var cw = 40, ch = 57, gap = 5, pad = 8, colTop = 70, filaOculta = 8, filaVisible = 16;
  var divs = {};     // carta -> div
  var sitios = {};   // 'mazo', 'descarte', 'base0'.., 'col0'.. -> div del hueco

  var el = {
    mesa: document.getElementById('mesa'),
    aviso: document.getElementById('aviso'),
    movs: document.getElementById('movs'),
    reloj: document.getElementById('reloj'),
    ganadas: document.getElementById('ganadas')
  };

  var robarSeg = P.segmentos(document.getElementById('robar'), String(datos.robar), function (v) {
    datos.robar = parseInt(v, 10);
    guardarDatos();
    nuevaPartida();
  });

  function guardarDatos() { almacen.escribir('v1', datos); }
  function tiempo(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function aviso(t) { el.aviso.textContent = t || ''; }

  // ---------- Medidas ----------
  function medir() {
    var ancho = el.mesa.clientWidth - 2 * pad;
    gap = Math.max(3, Math.round(ancho * 0.015));
    cw = Math.floor((ancho - 6 * gap) / 7);
    ch = Math.round(cw * 1.42);
    colTop = pad + ch + Math.round(gap * 2.5);
    var alto = Math.max(ch * 4, window.innerHeight - el.mesa.getBoundingClientRect().top - 90);
    el.mesa.style.height = alto + 'px';
    crearSitios();
    pintar();
  }
  function xCol(i) { return pad + i * (cw + gap); }

  function crearSitios() {
    Object.keys(sitios).forEach(function (k) { sitios[k].remove(); });
    sitios = {};
    function sitio(clave, x, y, texto) {
      var d = document.createElement('div');
      d.className = 'sitio';
      d.style.left = x + 'px';
      d.style.top = y + 'px';
      d.style.width = cw + 'px';
      d.style.height = ch + 'px';
      d.textContent = texto || '';
      d.setAttribute('data-sitio', clave);
      el.mesa.appendChild(d);
      sitios[clave] = d;
    }
    sitio('mazo', xCol(0), pad, '↻');
    sitio('descarte', xCol(1), pad);
    for (var b = 0; b < 4; b++) sitio('base' + b, xCol(3 + b), pad, S.PALOS[b]);
    for (var c = 0; c < 7; c++) sitio('col' + c, xCol(c), colTop, 'K');
  }

  // ---------- Cartas ----------
  function divDe(c) {
    var d = divs[c];
    if (d) return d;
    d = document.createElement('div');
    d.setAttribute('data-c', String(c));
    divs[c] = d;
    el.mesa.appendChild(d);
    return d;
  }

  function colocar(c, x, y, z, boca) {
    var d = divDe(c);
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.width = cw + 'px';
    d.style.height = ch + 'px';
    d.style.zIndex = String(z);
    var clase = 'carta' + (boca ? (S.roja(c) ? ' roja' : '') : ' dorso');
    if (d.className.indexOf('arrastrando') >= 0) clase += ' arrastrando';
    if (d.getAttribute('data-boca') !== String(boca) || d.style.fontSize !== Math.round(cw * 0.3) + 'px') {
      d.setAttribute('data-boca', String(boca));
      d.style.fontSize = Math.round(cw * 0.3) + 'px';
      d.innerHTML = boca
        ? '<div class="esquina">' + S.NOMBRES[S.valor(c)] + S.PALOS[S.palo(c)] + '</div><div class="centro" style="font-size:' + Math.round(cw * 0.55) + 'px">' + S.PALOS[S.palo(c)] + '</div>'
        : '';
    }
    d.className = clase;
  }

  function pintar() {
    if (!e || !sitios.mazo) return; // aún sin medir
    // Mazo
    e.mazo.forEach(function (c, i) { colocar(c, xCol(0), pad, 10 + i, false); });
    sitios.mazo.textContent = e.descarte.length ? '↻' : '';
    // Descarte: con robar 3 se ven las 3 últimas abiertas en abanico
    var abiertas = e.robar === 3 ? 3 : 1;
    var desde = Math.max(0, e.descarte.length - abiertas);
    e.descarte.forEach(function (c, i) {
      var x = xCol(1) + (i >= desde ? (i - desde) * Math.round(cw * 0.3) : 0);
      colocar(c, x, pad, 100 + i, true);
    });
    // Bases
    e.bases.forEach(function (b, k) { b.forEach(function (c, i) { colocar(c, xCol(3 + k), pad, 200 + i, true); }); });
    // Columnas: se aprietan si no caben
    var altoMax = el.mesa.clientHeight - colTop - ch - pad;
    e.columnas.forEach(function (col, k) {
      var fo = Math.round(ch * 0.12), fv = Math.round(ch * 0.3);
      var necesita = col.ocultas.length * fo + Math.max(0, col.visibles.length - 1) * fv;
      if (necesita > altoMax && necesita > 0) {
        var f = altoMax / necesita;
        fo = Math.max(3, Math.floor(fo * f));
        fv = Math.max(8, Math.floor(fv * f));
      }
      var y = colTop, z = 300;
      col.ocultas.forEach(function (c) { colocar(c, xCol(k), y, z++, false); y += fo; });
      col.visibles.forEach(function (c) { colocar(c, xCol(k), y, z++, true); y += fv; });
    });
    el.movs.textContent = e.movimientos + (e.movimientos === 1 ? ' movimiento' : ' movimientos');
    el.reloj.textContent = tiempo(segundos);
    el.ganadas.textContent = 'Ganadas: ' + (datos.ganadas[e.robar] || 0);
    document.getElementById('deshacer').disabled = !historial.length || terminada;
  }

  // ---------- Partida ----------
  function guardarPartida() {
    if (terminada) partida.borrar();
    else partida.guardar({ e: e, segundos: segundos }, e.movimientos > 0);
  }

  function nuevaPartida() {
    e = S.nuevo(datos.robar);
    segundos = 0;
    empezar();
    guardarPartida();
  }

  function empezar() {
    clearTimeout(acabando);
    historial = [];
    terminada = false;
    el.mesa.classList.remove('ganada');
    Object.keys(divs).forEach(function (k) { divs[k].remove(); });
    divs = {};
    robarSeg.poner(String(e.robar));
    aviso('');
    pintar();
    clearInterval(reloj);
    reloj = setInterval(function () {
      if (terminada || document.hidden || !e.movimientos) return;
      segundos++;
      el.reloj.textContent = tiempo(segundos);
      if (segundos % 15 === 0) guardarPartida();
    }, 1000);
  }

  function recuperar() {
    var g = partida.cargar();
    if (!g || !S.valido(g.e) || S.ganada(g.e)) return false;
    e = g.e;
    if (e.robar !== 1 && e.robar !== 3) e.robar = 1;
    e.movimientos = e.movimientos | 0;
    segundos = g.segundos | 0;
    datos.robar = e.robar;
    empezar();
    return true;
  }

  function despues() {
    pintar();
    if (S.ganada(e)) return ganar();
    guardarPartida();
    if (S.resoluble(e)) {
      aviso('¡Todo destapado! Terminando…');
      acabar();
    } else if (!S.hayJugadas(e)) {
      aviso('No quedan jugadas útiles. Deshaz o empieza otra.');
    } else {
      aviso('');
    }
  }

  function acabar() {
    clearTimeout(acabando);
    acabando = setTimeout(function () {
      if (terminada) return;
      if (S.pasoFinal(e)) {
        pintar();
        if (S.ganada(e)) ganar(); else acabar();
      }
    }, 90);
  }

  function ganar() {
    terminada = true;
    clearInterval(reloj);
    datos.ganadas[e.robar] = (datos.ganadas[e.robar] || 0) + 1;
    var m = datos.mejor[e.robar];
    var nuevo = !m || segundos < m;
    if (nuevo) datos.mejor[e.robar] = segundos;
    guardarDatos();
    partida.borrar();
    pintar();
    el.mesa.classList.add('ganada');
    aviso((nuevo ? '¡Récord! ' : '¡Ganaste! ') + tiempo(segundos) + ' · ' + e.movimientos + ' movimientos 🎉');
    P.vibrar(250);
  }

  function hacer(fn) {
    if (terminada) return false;
    var antes = JSON.stringify(e);
    if (!fn()) return false;
    historial.push(antes);
    if (historial.length > 100) historial.shift();
    despues();
    return true;
  }

  // ---------- Dónde está cada carta ----------
  function origenDe(c) {
    if (e.descarte.length && e.descarte[e.descarte.length - 1] === c) return { tipo: 'descarte' };
    for (var b = 0; b < 4; b++) {
      var base = e.bases[b];
      if (base.length && base[base.length - 1] === c) return { tipo: 'base', i: b };
    }
    for (var i = 0; i < 7; i++) {
      var k = e.columnas[i].visibles.indexOf(c);
      if (k >= 0) return { tipo: 'columna', i: i, k: k };
    }
    return null;
  }

  // Sitio de destino bajo el punto (x, y) de la mesa
  function destinoEn(x, y) {
    if (y < colTop - gap) {
      for (var b = 0; b < 4; b++) if (x >= xCol(3 + b) - gap && x <= xCol(3 + b) + cw + gap) return { tipo: 'base', i: b };
      return null;
    }
    for (var i = 0; i < 7; i++) if (x >= xCol(i) - gap / 2 && x <= xCol(i) + cw + gap / 2) return { tipo: 'columna', i: i };
    return null;
  }

  function sacudir(c) {
    var d = divs[c];
    if (!d) return;
    d.classList.remove('no');
    void d.offsetWidth;
    d.classList.add('no');
    P.vibrar(25);
  }

  // ---------- Tocar y arrastrar ----------
  var toque = null;

  el.mesa.addEventListener('pointerdown', function (ev) {
    if (terminada || toque) return;
    var d = ev.target.closest ? ev.target.closest('.carta, .sitio') : null;
    if (!d) return;
    var r = el.mesa.getBoundingClientRect();
    var c = d.hasAttribute('data-c') ? parseInt(d.getAttribute('data-c'), 10) : null;
    var enMazo = d.getAttribute('data-sitio') === 'mazo' || (c !== null && e.mazo.indexOf(c) >= 0);
    toque = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, mesaX: r.left, mesaY: r.top, c: c, mazo: enMazo, movido: false, grupo: [] };
    if (c !== null && !enMazo) {
      var o = origenDe(c);
      if (o) {
        toque.origen = o;
        toque.grupo = S.cartasDe(e, o).map(function (x) { return divs[x]; });
      }
    }
  });

  el.mesa.addEventListener('pointermove', function (ev) {
    if (!toque || ev.pointerId !== toque.id || !toque.grupo.length) return;
    var dx = ev.clientX - toque.x, dy = ev.clientY - toque.y;
    if (!toque.movido && Math.abs(dx) + Math.abs(dy) < 8) return;
    if (!toque.movido) {
      toque.movido = true;
      toque.grupo.forEach(function (d, k) {
        d.classList.add('arrastrando');
        d.style.zIndex = String(1000 + k);
      });
    }
    toque.grupo.forEach(function (d) { d.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; });
  });

  function soltar(ev, cancelado) {
    if (!toque || ev.pointerId !== toque.id) return;
    var t = toque;
    toque = null;
    t.grupo.forEach(function (d) { d.classList.remove('arrastrando'); d.style.transform = ''; });
    if (cancelado) return pintar();
    if (t.mazo && !t.movido) {
      if (!hacer(function () { return S.robar(e); })) pintar();
      return;
    }
    if (!t.origen) return pintar();
    if (t.movido) {
      // Punto medio de la primera carta arrastrada
      var x = parseFloat(t.grupo[0].style.left) + cw / 2 + (ev.clientX - t.x);
      var y = parseFloat(t.grupo[0].style.top) + ch / 2 + (ev.clientY - t.y);
      var d = destinoEn(x, y);
      if (!d || !hacer(function () { return S.mover(e, t.origen, d); })) {
        pintar();
        if (d) sacudir(t.c);
      }
      return;
    }
    var mejor = S.mejorDestino(e, t.origen);
    if (!mejor || !hacer(function () { return S.mover(e, t.origen, mejor); })) {
      pintar();
      sacudir(t.c);
    } else {
      P.vibrar(8);
    }
  }
  el.mesa.addEventListener('pointerup', function (ev) { soltar(ev, false); });
  el.mesa.addEventListener('pointercancel', function (ev) { soltar(ev, true); });

  // ---------- Botones ----------
  document.getElementById('deshacer').addEventListener('click', function () {
    if (terminada || !historial.length) return;
    clearTimeout(acabando);
    e = JSON.parse(historial.pop());
    e.movimientos++; // deshacer también cuenta
    aviso('');
    pintar();
    guardarPartida();
  });

  document.getElementById('pistaBtn').addEventListener('click', function () {
    if (terminada) return;
    var o = buscarPista();
    if (!o) {
      if (e.mazo.length || e.descarte.length) { aviso('Roba del mazo'); destacar(e.mazo.length ? e.mazo[e.mazo.length - 1] : null); }
      else aviso('No quedan jugadas útiles');
      return;
    }
    aviso('');
    destacar(S.cartasDe(e, o)[0]);
  });

  function destacar(c) {
    var d = c === null ? sitios.mazo : divs[c];
    if (!d) return;
    d.classList.add('pista');
    setTimeout(function () { d.classList.remove('pista'); }, 1200);
  }

  // Una jugada que sirva: subir a la base, destapar una carta o sacar la del descarte
  function buscarPista() {
    var cand = [];
    for (var i = 0; i < 7; i++) {
      var col = e.columnas[i];
      for (var k = 0; k < col.visibles.length; k++) cand.push({ tipo: 'columna', i: i, k: k });
    }
    cand.push({ tipo: 'descarte' });
    for (var n = 0; n < cand.length; n++) {
      var o = cand[n], d = S.mejorDestino(e, o);
      if (!d) continue;
      if (d.tipo === 'base' || o.tipo === 'descarte') return o;
      if (o.k === 0 && e.columnas[o.i].ocultas.length) return o;
    }
    return null;
  }

  document.getElementById('nueva').addEventListener('click', nuevaPartida);
  window.addEventListener('resize', medir);
  window.addEventListener('pagehide', function () { if (e && !terminada) guardarPartida(); });

  if (!recuperar()) nuevaPartida();
  medir();
})();
