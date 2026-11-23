// Interfaz del Ahorcado: teclado, dibujo, marcador y ajustes.
// Solo: el móvil elige una palabra de la categoría. 2 jugadores: uno escribe la palabra
// a escondidas y el otro la adivina; en cada partida se cambian los papeles.
(function () {
  'use strict';

  var A = window.Ahorcado;
  var Android = window.Android;

  var CLAVE = 'ahorcado.v1';
  var RECIENTES = 25; // palabras que no se repiten seguidas
  var datos = cargar();

  var partida = null, teclas = {}, escribe = 1, terminada = false;

  var el = {
    pantalla: document.getElementById('pantalla'),
    modos: document.getElementById('modos'),
    categorias: document.getElementById('categorias'),
    cas1: document.getElementById('cas1'),
    cas3: document.getElementById('cas3'),
    nombre1: document.getElementById('nombre1'),
    nombre3: document.getElementById('nombre3'),
    valor1: document.getElementById('valor1'),
    valor2: document.getElementById('valor2'),
    valor3: document.getElementById('valor3'),
    secreto: document.getElementById('secreto'),
    textoSecreto: document.getElementById('textoSecreto'),
    secreta: document.getElementById('secreta'),
    verSecreta: document.getElementById('verSecreta'),
    pistaSecreta: document.getElementById('pistaSecreta'),
    error: document.getElementById('error'),
    juego: document.getElementById('juego'),
    escena: document.getElementById('escena'),
    partes: document.querySelectorAll('#escena .parte'),
    pista: document.getElementById('pista'),
    palabra: document.getElementById('palabra'),
    estado: document.getElementById('estado'),
    teclado: document.getElementById('teclado')
  };

  // ---------- Persistencia ----------
  function cargar() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'solo' && d.modo !== 'dos') d.modo = 'solo';
    if (d.categoria !== 'todas' && !A.CATEGORIAS[d.categoria]) d.categoria = 'todas';
    if (!d.solo || typeof d.solo !== 'object') d.solo = { ganadas: 0, perdidas: 0, racha: 0, mejorRacha: 0 };
    if (!d.dos || typeof d.dos !== 'object') d.dos = { 1: 0, 2: 0 };
    if (!Array.isArray(d.recientes)) d.recientes = [];
    return d;
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Utilidades ----------
  function solo() { return datos.modo === 'solo'; }
  function adivina() { return escribe === 1 ? 2 : 1; }
  function vibrar(ms) {
    try {
      if (Android && Android.vibrar) Android.vibrar(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }
  function saltar(nodo) {
    nodo.classList.remove('salto');
    void nodo.offsetWidth;
    nodo.classList.add('salto');
  }
  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = clase || '';
  }

  // ---------- Pintado ----------
  function crearTeclado() {
    el.teclado.innerHTML = '';
    teclas = {};
    A.LETRAS.forEach(function (l) {
      var b = document.createElement('button');
      b.textContent = l;
      b.setAttribute('data-letra', l);
      el.teclado.appendChild(b);
      teclas[l] = b;
    });
  }

  function pintarAjustes() {
    var bm = el.modos.querySelectorAll('button');
    for (var i = 0; i < bm.length; i++) bm[i].classList.toggle('activo', bm[i].getAttribute('data-modo') === datos.modo);
    var bc = el.categorias.querySelectorAll('button');
    for (var j = 0; j < bc.length; j++) bc[j].classList.toggle('activo', bc[j].getAttribute('data-cat') === datos.categoria);
    el.categorias.classList.toggle('oculto', !solo());
    el.pantalla.classList.toggle('dos', !solo());
    el.nombre1.textContent = solo() ? 'Ganadas' : 'Jugador 1';
    el.nombre3.textContent = solo() ? 'Perdidas' : 'Jugador 2';
  }

  function pintarMarcador() {
    if (solo()) {
      el.valor1.textContent = datos.solo.ganadas;
      el.valor3.textContent = datos.solo.perdidas;
    } else {
      el.valor1.textContent = datos.dos[1];
      el.valor3.textContent = datos.dos[2];
    }
    el.valor2.textContent = (partida ? partida.fallos : 0) + '/' + A.MAX_FALLOS;
    var jugando = !solo() && partida && !terminada;
    el.cas1.classList.toggle('turno', jugando && adivina() === 1);
    el.cas3.classList.toggle('turno', jugando && adivina() === 2);
  }

  function pintarDibujo() {
    var f = partida ? partida.fallos : 0;
    for (var i = 0; i < el.partes.length; i++) el.partes[i].classList.toggle('ver', i < f);
  }

  function pintarPalabra(nuevas, final) {
    var m = A.mascara(partida);
    el.palabra.innerHTML = '';
    el.palabra.classList.toggle('ganada', final === 'gana');
    m.forEach(function (letra, i) {
      var s = document.createElement('span');
      if (letra) {
        s.textContent = letra;
        if (nuevas && nuevas.indexOf(A.normalizar(letra)) >= 0) s.className = 'nueva';
      } else if (final === 'pierde') {
        s.textContent = partida.palabra[i];
        s.className = 'faltaba';
      }
      el.palabra.appendChild(s);
    });
  }

  function pintarPista() {
    el.pista.innerHTML = '';
    if (!partida || !partida.pista) return;
    el.pista.appendChild(document.createTextNode('Pista: '));
    var b = document.createElement('b');
    b.textContent = partida.pista;
    el.pista.appendChild(b);
  }

  function pintarTurno() {
    if (solo()) ponerEstado('Elige una letra');
    else ponerEstado('Adivina el jugador ' + adivina(), 'j' + adivina());
  }

  // ---------- Juego ----------
  function nuevaPartida() {
    terminada = false;
    partida = null;
    crearTeclado();
    el.escena.classList.remove('ganada', 'perdida');
    el.palabra.classList.remove('ganada');
    el.palabra.innerHTML = '';
    pintarAjustes();

    if (solo()) {
      var e = A.elegir(datos.categoria, Math.random, datos.recientes);
      datos.recientes.push(e.palabra);
      if (datos.recientes.length > RECIENTES) datos.recientes = datos.recientes.slice(-RECIENTES);
      guardar();
      empezar(e.palabra, A.CATEGORIAS[e.categoria].nombre);
    } else {
      pedirPalabra();
    }
  }

  // 2 jugadores: pantalla para escribir la palabra a escondidas
  function pedirPalabra() {
    el.secreto.classList.remove('oculto');
    el.juego.classList.add('oculto');
    el.teclado.classList.add('oculto');
    el.palabra.classList.add('oculto');
    el.textoSecreto.textContent = 'Jugador ' + escribe + ': escribe una palabra sin que la vea el jugador ' + adivina() + '.';
    el.secreta.value = '';
    el.pistaSecreta.value = '';
    el.secreta.classList.add('tapada');
    el.verSecreta.textContent = 'Ver';
    el.error.textContent = '';
    ponerEstado('');
    pintarDibujo();
    pintarMarcador();
  }

  function empezar(palabra, pista) {
    partida = A.nueva(palabra, pista);
    el.secreto.classList.add('oculto');
    el.juego.classList.remove('oculto');
    el.teclado.classList.remove('oculto');
    el.palabra.classList.remove('oculto');
    el.teclado.classList.remove('parado');
    pintarDibujo();
    pintarPista();
    pintarPalabra();
    pintarMarcador();
    pintarTurno();
  }

  function probar(letra) {
    if (!partida || terminada) return;
    var base = A.normalizar(letra);
    var r = A.probar(partida, letra);
    if (r === 'invalida' || r === 'terminada') return;
    if (r === 'repetida') {
      ponerEstado('Ya has probado la ' + base);
      vibrar(30);
      return;
    }
    var t = teclas[base];
    if (t) t.classList.add(r === 'acierto' ? 'bien' : 'mal');
    pintarDibujo();
    pintarMarcador();

    var fin = A.resultado(partida);
    pintarPalabra(r === 'acierto' ? [base] : null, fin);
    if (fin) return finPartida(fin);

    if (r === 'acierto') {
      ponerEstado('¡Bien! Hay ' + base, 'bien');
      vibrar(14);
    } else {
      var quedan = A.MAX_FALLOS - partida.fallos;
      ponerEstado('No hay ' + base + ' · te ' + (quedan === 1 ? 'queda 1 fallo' : 'quedan ' + quedan + ' fallos'), 'mal');
      vibrar(50);
    }
  }

  function finPartida(fin) {
    terminada = true;
    el.teclado.classList.add('parado');
    el.escena.classList.add(fin === 'gana' ? 'ganada' : 'perdida');
    if (solo()) {
      var s = datos.solo;
      if (fin === 'gana') {
        s.ganadas++;
        s.racha++;
        if (s.racha > s.mejorRacha) s.mejorRacha = s.racha;
        ponerEstado('¡Acertaste! 🎉 Racha: ' + s.racha + (s.racha === s.mejorRacha && s.racha > 1 ? ' (récord)' : ''), 'bien');
        saltar(el.cas1);
        vibrar(220);
      } else {
        s.perdidas++;
        s.racha = 0;
        ponerEstado('Ahorcado. Era «' + partida.palabra + '»', 'mal');
        saltar(el.cas3);
        vibrar(90);
      }
    } else {
      var g = fin === 'gana' ? adivina() : escribe;
      datos.dos[g]++;
      ponerEstado(fin === 'gana'
        ? '¡El jugador ' + g + ' la ha adivinado! 🎉'
        : 'Ahorcado. Punto para el jugador ' + g, 'j' + g);
      saltar(g === 1 ? el.cas1 : el.cas3);
      vibrar(220);
      escribe = adivina(); // la próxima escribe el otro
    }
    guardar();
    pintarMarcador();
  }

  // ---------- Controles ----------
  el.teclado.addEventListener('click', function (e) {
    var l = e.target.getAttribute && e.target.getAttribute('data-letra');
    if (l) probar(l);
  });

  // Teclado físico (útil en tableta o al probar en el ordenador)
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.key && e.key.length === 1) probar(e.key);
  });

  el.empezar = document.getElementById('empezar');
  el.empezar.addEventListener('click', function () {
    var r = A.limpiarPalabra(el.secreta.value);
    if (r.error) {
      el.error.textContent = r.error;
      vibrar(30);
      return;
    }
    el.secreta.blur();
    el.pistaSecreta.blur();
    empezar(r.palabra, el.pistaSecreta.value.trim());
  });
  el.secreta.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') el.pistaSecreta.focus();
  });
  el.pistaSecreta.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') el.empezar.click();
  });
  el.verSecreta.addEventListener('click', function () {
    var tapada = el.secreta.classList.toggle('tapada');
    el.verSecreta.textContent = tapada ? 'Ver' : 'Ocultar';
  });

  el.modos.addEventListener('click', function (e) {
    var m = e.target.getAttribute && e.target.getAttribute('data-modo');
    if (!m || m === datos.modo) return;
    datos.modo = m;
    guardar();
    escribe = 1;
    nuevaPartida();
  });

  el.categorias.addEventListener('click', function (e) {
    var c = e.target.getAttribute && e.target.getAttribute('data-cat');
    if (!c || c === datos.categoria) return;
    datos.categoria = c;
    guardar();
    nuevaPartida();
  });

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    if (solo()) datos.solo = { ganadas: 0, perdidas: 0, racha: 0, mejorRacha: 0 };
    else datos.dos = { 1: 0, 2: 0 };
    guardar();
    pintarMarcador();
  });

  nuevaPartida();
})();
