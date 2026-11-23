// Interfaz del Ahorcado: teclado, dibujo, marcador y ajustes.
// Solo: el móvil elige una palabra de la categoría. 2 jugadores: uno escribe la palabra
// a escondidas y el otro la adivina; en cada partida se cambian los papeles.
(function () {
  'use strict';

  var A = window.Ahorcado;
  var P = window.Plataforma;

  var almacen = P.almacen('ahorcado'); // ajustes, marcadores y palabras recientes en "ahorcado.v1"
  var guardada = P.partida('ahorcado'); // partida a medias en "ahorcado.partida"
  var RECIENTES = 25; // palabras que no se repiten seguidas
  var datos = cargar();

  var partida = null, teclas = {}, escribe = 1, terminada = false, mc = null;

  var el = {
    pantalla: document.getElementById('pantalla'),
    marcador: document.getElementById('marcador'),
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

  var modos = P.segmentos(document.getElementById('modos'), datos.modo, function (m) {
    datos.modo = m;
    guardar();
    escribe = 1;
    nuevaPartida();
  });
  var categorias = P.segmentos(document.getElementById('categorias'), datos.categoria, function (c) {
    datos.categoria = c;
    guardar();
    nuevaPartida();
  });

  // ---------- Persistencia ----------
  function cargar() {
    var d = almacen.leer('v1', null);
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'solo' && d.modo !== 'dos') d.modo = 'solo';
    if (d.categoria !== 'todas' && !A.CATEGORIAS[d.categoria]) d.categoria = 'todas';
    if (!d.solo || typeof d.solo !== 'object') d.solo = { ganadas: 0, perdidas: 0, racha: 0, mejorRacha: 0 };
    if (!d.dos || typeof d.dos !== 'object') d.dos = { 1: 0, 2: 0 };
    if (!Array.isArray(d.recientes)) d.recientes = [];
    return d;
  }
  function guardar() { almacen.escribir('v1', datos); }

  // La partida a medias se guarda tras cada letra y se borra al terminar
  function guardarPartida() {
    if (!partida || terminada || !partida.probadas.length) return guardada.borrar();
    guardada.guardar({ modo: datos.modo, partida: partida, escribe: escribe });
  }

  // ---------- Utilidades ----------
  function solo() { return datos.modo === 'solo'; }
  function adivina() { return escribe === 1 ? 2 : 1; }
  var vibrar = P.vibrar;
  function ponerEstado(texto, clase) {
    el.estado.textContent = texto;
    el.estado.className = 'estado' + (clase ? ' ' + clase : '');
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
    modos.poner(datos.modo);
    categorias.poner(datos.categoria);
    categorias.ver(solo());
    el.pantalla.classList.toggle('dos', !solo());
    mc = P.marcador(el.marcador, solo()
      ? [{ id: '1', nombre: 'Ganadas', color: 'var(--bien)' }, { id: 'F', nombre: 'Fallos' }, { id: '2', nombre: 'Perdidas', color: 'var(--mal)' }]
      : [{ id: '1', nombre: 'Jugador 1', color: 'var(--j1)' }, { id: 'F', nombre: 'Fallos' }, { id: '2', nombre: 'Jugador 2', color: 'var(--j2)' }]);
  }

  function pintarMarcador() {
    var f = (partida ? partida.fallos : 0) + '/' + A.MAX_FALLOS;
    if (solo()) mc.pintar({ 1: datos.solo.ganadas, F: f, 2: datos.solo.perdidas });
    else mc.pintar({ 1: datos.dos[1], F: f, 2: datos.dos[2] });
    mc.turno(!solo() && partida && !terminada ? String(adivina()) : null);
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
      guardada.borrar();
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
    guardada.borrar();
    ponerEstado('');
    pintarDibujo();
    pintarMarcador();
  }

  function empezar(palabra, pista, recuperada) {
    partida = recuperada || A.nueva(palabra, pista);
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
    if (recuperada) {
      partida.probadas.forEach(function (l) {
        if (teclas[l]) teclas[l].classList.add(A.mascara(partida).some(function (x) { return x && A.normalizar(x) === l; }) ? 'bien' : 'mal');
      });
      ponerEstado('Partida recuperada');
    }
  }

  // Recupera la partida a medias si es del modo actual
  function recuperar() {
    var g = guardada.cargar();
    var p = g && g.partida;
    if (!p || g.modo !== datos.modo || typeof p.palabra !== 'string' || !Array.isArray(p.probadas)) return false;
    if (A.resultado(p)) return false;
    escribe = g.escribe === 2 ? 2 : 1;
    terminada = false;
    crearTeclado();
    pintarAjustes();
    empezar(p.palabra, p.pista, p);
    return true;
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
    guardarPartida();
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
    guardada.borrar();
    el.teclado.classList.add('parado');
    el.escena.classList.add(fin === 'gana' ? 'ganada' : 'perdida');
    if (solo()) {
      var s = datos.solo;
      if (fin === 'gana') {
        s.ganadas++;
        s.racha++;
        if (s.racha > s.mejorRacha) s.mejorRacha = s.racha;
        ponerEstado('¡Acertaste! 🎉 Racha: ' + s.racha + (s.racha === s.mejorRacha && s.racha > 1 ? ' (récord)' : ''), 'bien');
        mc.saltar('1');
        vibrar(220);
      } else {
        s.perdidas++;
        s.racha = 0;
        ponerEstado('Ahorcado. Era «' + partida.palabra + '»', 'mal');
        mc.saltar('2');
        vibrar(90);
      }
    } else {
      var g = fin === 'gana' ? adivina() : escribe;
      datos.dos[g]++;
      ponerEstado(fin === 'gana'
        ? '¡El jugador ' + g + ' la ha adivinado! 🎉'
        : 'Ahorcado. Punto para el jugador ' + g, 'j' + g);
      mc.saltar(String(g));
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

  document.getElementById('nueva').addEventListener('click', nuevaPartida);

  document.getElementById('borrar').addEventListener('click', function () {
    if (solo()) datos.solo = { ganadas: 0, perdidas: 0, racha: 0, mejorRacha: 0 };
    else datos.dos = { 1: 0, 2: 0 };
    guardar();
    pintarMarcador();
  });

  if (!recuperar()) nuevaPartida();
})();
