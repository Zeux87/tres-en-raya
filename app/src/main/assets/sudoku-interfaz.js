// Pantalla del Sudoku: rejilla, teclado, notas, pistas, deshacer, reloj y récord por nivel.
// La partida a medias se guarda tras cada cambio.
(function () {
  'use strict';

  var S = window.Sudoku;
  var P = window.Plataforma;
  var NIVELES = ['facil', 'normal', 'dificil'];

  var almacen = P.almacen('sudoku');
  var partida = P.partida('sudoku');
  var datos = almacen.leer('v1', null);
  if (!datos || typeof datos !== 'object') datos = {};
  if (NIVELES.indexOf(datos.nivel) < 0) datos.nivel = 'normal';
  if (!datos.records || typeof datos.records !== 'object') datos.records = {};
  if (typeof datos.ganadas !== 'number') datos.ganadas = 0;

  var g = null;           // { nivel, inicial, solucion, valores, notas, errores, segundos }
  var elegida = -1, modoNotas = false, historial = [], terminada = false, reloj = null;
  var celdas = [], teclas = [];

  var el = {
    rejilla: document.getElementById('rejilla'),
    teclado: document.getElementById('teclado'),
    errores: document.getElementById('errores'),
    reloj: document.getElementById('reloj'),
    record: document.getElementById('record'),
    estado: document.getElementById('estado'),
    notas: document.getElementById('notas')
  };

  var niveles = P.segmentos(document.getElementById('niveles'), datos.nivel, function (n) {
    datos.nivel = n;
    almacen.escribir('v1', datos);
    nuevaPartida();
  });

  function tiempo(s) {
    var m = Math.floor(s / 60), x = s % 60;
    return m + ':' + (x < 10 ? '0' : '') + x;
  }

  // ---------- Construcción ----------
  for (var i = 0; i < 81; i++) {
    var c = document.createElement('div');
    c.className = 'celda';
    c.setAttribute('data-i', String(i));
    el.rejilla.appendChild(c);
    celdas.push(c);
  }
  for (var n = 1; n <= 9; n++) {
    var b = document.createElement('button');
    b.setAttribute('data-n', String(n));
    b.innerHTML = n + '<small></small>';
    el.teclado.appendChild(b);
    teclas.push(b);
  }

  // ---------- Pintado ----------
  function pintar() {
    var v = g.valores;
    var elegido = elegida >= 0 ? v[elegida] : 0;
    var cuenta = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var i = 0; i < 81; i++) if (v[i] && v[i] === g.solucion[i]) cuenta[v[i]]++;
    for (var k = 0; k < 81; k++) {
      var c = celdas[k];
      var dada = g.inicial[k] > 0;
      c.className = 'celda' + (dada ? ' dada' : '') + (v[k] && v[k] !== g.solucion[k] ? ' mal' : '');
      if (elegida >= 0) {
        if (k === elegida) c.classList.add('elegida');
        else if (elegido && v[k] === elegido) c.classList.add('igual');
        else if (S.VECINAS[elegida].indexOf(k) >= 0) c.classList.add('zona');
      }
      if (v[k]) {
        c.textContent = String(v[k]);
      } else if (g.notas[k]) {
        var html = '<div class="notas">';
        for (var n = 1; n <= 9; n++) html += '<span>' + (g.notas[k] & (1 << n) ? n : '') + '</span>';
        c.innerHTML = html + '</div>';
      } else {
        c.textContent = '';
      }
    }
    teclas.forEach(function (b, idx) {
      var quedan = 9 - cuenta[idx + 1];
      b.disabled = quedan <= 0 || terminada;
      b.querySelector('small').textContent = quedan > 0 ? String(quedan) : '';
    });
    el.errores.textContent = 'Errores: ' + g.errores;
    el.reloj.textContent = tiempo(g.segundos);
    var r = datos.records[g.nivel];
    el.record.textContent = 'Récord: ' + (r ? tiempo(r) : '–');
    el.notas.classList.toggle('activo', modoNotas);
  }

  function estado(texto) {
    el.estado.textContent = texto || '';
    el.estado.classList.toggle('oculto', !texto);
  }

  // ---------- Partida ----------
  function guardarPartida() {
    if (terminada) partida.borrar();
    // En el menú sale "partida a medias" en cuanto se ha escrito algo
    else partida.guardar(g, g.valores.some(function (v, i) { return v !== g.inicial[i]; }) || g.notas.some(Boolean));
  }

  function nuevaPartida() {
    var nuevo = S.generar(datos.nivel);
    g = {
      nivel: datos.nivel,
      inicial: nuevo.inicial,
      solucion: nuevo.solucion,
      valores: nuevo.inicial.slice(),
      notas: nuevo.inicial.map(function () { return 0; }),
      errores: 0,
      segundos: 0
    };
    empezar();
    guardarPartida();
  }

  function empezar() {
    elegida = -1;
    historial = [];
    terminada = false;
    modoNotas = false;
    el.rejilla.classList.remove('ganada');
    estado('');
    niveles.poner(g.nivel);
    pintar();
    arrancarReloj();
  }

  function recuperar() {
    var x = partida.cargar();
    if (!x || NIVELES.indexOf(x.nivel) < 0 || !S.esTablero(x.inicial) || !S.esTablero(x.solucion) || !S.esTablero(x.valores)) return false;
    if (!Array.isArray(x.notas) || x.notas.length !== 81 || S.completo(x.valores, x.solucion)) return false;
    g = x;
    g.errores = g.errores | 0;
    g.segundos = g.segundos | 0;
    datos.nivel = g.nivel;
    empezar();
    return true;
  }

  function arrancarReloj() {
    clearInterval(reloj);
    reloj = setInterval(function () {
      if (terminada || document.hidden) return;
      g.segundos++;
      el.reloj.textContent = tiempo(g.segundos);
      if (g.segundos % 10 === 0) guardarPartida();
    }, 1000);
  }

  function apuntar() {
    historial.push({ i: elegida, v: g.valores[elegida], n: g.notas[elegida] });
    if (historial.length > 200) historial.shift();
  }

  function poner(n) {
    if (terminada || elegida < 0 || g.inicial[elegida]) return;
    var i = elegida;
    if (modoNotas) {
      if (g.valores[i]) return;
      apuntar();
      g.notas[i] ^= 1 << n;
    } else {
      if (g.valores[i] === n) return;
      apuntar();
      g.valores[i] = n;
      g.notas[i] = 0;
      if (n !== g.solucion[i]) {
        g.errores++;
        P.vibrar(40);
      } else {
        P.vibrar(8);
        // Quita esa nota de las vecinas
        S.VECINAS[i].forEach(function (j) { g.notas[j] &= ~(1 << n); });
      }
    }
    pintar();
    if (S.completo(g.valores, g.solucion)) return ganar();
    guardarPartida();
  }

  function borrar() {
    if (terminada || elegida < 0 || g.inicial[elegida]) return;
    if (!g.valores[elegida] && !g.notas[elegida]) return;
    apuntar();
    g.valores[elegida] = 0;
    g.notas[elegida] = 0;
    pintar();
    guardarPartida();
  }

  function deshacer() {
    if (terminada || !historial.length) return;
    var h = historial.pop();
    g.valores[h.i] = h.v;
    g.notas[h.i] = h.n;
    elegida = h.i;
    pintar();
    guardarPartida();
  }

  function pista() {
    if (terminada) return;
    // En la casilla elegida si está vacía o mal; si no, en una vacía cualquiera
    var i = elegida;
    if (i < 0 || g.valores[i] === g.solucion[i]) {
      var vacias = [];
      for (var k = 0; k < 81; k++) if (g.valores[k] !== g.solucion[k]) vacias.push(k);
      if (!vacias.length) return;
      i = vacias[Math.floor(Math.random() * vacias.length)];
    }
    elegida = i;
    apuntar();
    g.valores[i] = g.solucion[i];
    g.notas[i] = 0;
    g.segundos += 30; // una pista cuesta 30 segundos
    estado('Pista: +30 segundos');
    setTimeout(function () { if (!terminada) estado(''); }, 1500);
    pintar();
    if (S.completo(g.valores, g.solucion)) return ganar();
    guardarPartida();
  }

  function ganar() {
    terminada = true;
    clearInterval(reloj);
    var r = datos.records[g.nivel];
    var nuevo = !r || g.segundos < r;
    if (nuevo) datos.records[g.nivel] = g.segundos;
    datos.ganadas++;
    almacen.escribir('v1', datos);
    partida.borrar();
    elegida = -1;
    pintar();
    el.rejilla.classList.add('ganada');
    estado((nuevo ? '¡Nuevo récord! ' : '¡Resuelto! ') + tiempo(g.segundos) + (g.errores ? ' · ' + g.errores + (g.errores === 1 ? ' error' : ' errores') : ' sin errores') + ' 🎉');
    P.vibrar(220);
  }

  // ---------- Controles ----------
  el.rejilla.addEventListener('click', function (e) {
    var c = e.target.closest ? e.target.closest('.celda') : null;
    if (!c || terminada) return;
    elegida = parseInt(c.getAttribute('data-i'), 10);
    pintar();
  });
  el.teclado.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (b) poner(parseInt(b.getAttribute('data-n'), 10));
  });
  document.getElementById('borrarCelda').addEventListener('click', borrar);
  document.getElementById('deshacer').addEventListener('click', deshacer);
  document.getElementById('pista').addEventListener('click', pista);
  el.notas.addEventListener('click', function () {
    modoNotas = !modoNotas;
    pintar();
  });
  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.addEventListener('keydown', function (e) {
    if (e.key >= '1' && e.key <= '9') poner(parseInt(e.key, 10));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') borrar();
    else if (e.key === 'n') { modoNotas = !modoNotas; pintar(); }
    else if (elegida >= 0 && e.key.indexOf('Arrow') === 0) {
      var f = Math.floor(elegida / 9), c = elegida % 9;
      if (e.key === 'ArrowUp') f = (f + 8) % 9;
      if (e.key === 'ArrowDown') f = (f + 1) % 9;
      if (e.key === 'ArrowLeft') c = (c + 8) % 9;
      if (e.key === 'ArrowRight') c = (c + 1) % 9;
      elegida = f * 9 + c;
      pintar();
      e.preventDefault();
    }
  });
  window.addEventListener('pagehide', function () { if (g && !terminada) guardarPartida(); });

  if (!recuperar()) nuevaPartida();
})();
