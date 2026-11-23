// Interfaz de Hundir la flota: 2 jugadores en el mismo móvil.
// Fases: inicio -> pase -> colocar (J1) -> pase -> colocar (J2) -> pase -> disparar ... -> fin
(function () {
  'use strict';

  var F = window.Flota;
  var P = window.Plataforma;
  var raiz = document.getElementById('pantalla');

  // Datos en "flota.partida", "flota.nombres", "flota.marcador" y "flota.empieza"
  var almacen = P.almacen('flota');
  var partida = P.partida('flota');
  var CLAVE_NOMBRES = 'nombres';
  var CLAVE_MARCADOR = 'marcador';
  var CLAVE_EMPIEZA = 'empieza';

  var estado = partida.cargar();
  if (!estado || !estado.fase || !estado.jugadores) estado = { fase: 'inicio' };

  // Estado solo de pantalla (no se guarda)
  var ui = { sel: null, horizontal: true, ayuda: '', ayudaError: false, invalida: -1, confirmarAbandono: false };
  var temporizador = null;

  // ---------- Almacenamiento ----------
  var leer = almacen.leer;
  var escribir = almacen.escribir;
  function guardar() {
    var enCurso = !!estado.jugadores && estado.fase !== 'inicio' && estado.fase !== 'fin' &&
      (estado.ganador === null || estado.ganador === undefined);
    partida.guardar(estado, enCurso);
  }

  function nombres() {
    var n = leer(CLAVE_NOMBRES, null);
    if (!n || n.length !== 2) n = ['Jugador 1', 'Jugador 2'];
    return n;
  }
  function marcador() { return leer(CLAVE_MARCADOR, {}) || {}; }

  // ---------- Utilidades ----------
  function h(etiqueta, attrs, hijos) {
    var e = document.createElement(etiqueta);
    if (attrs) {
      for (var k in attrs) {
        if (!attrs.hasOwnProperty(k) || attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
        if (k === 'texto') e.textContent = attrs[k];
        else if (k === 'clase') e.className = attrs[k];
        else if (k.indexOf('al') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
    }
    (hijos || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  var vibrar = P.vibrar;

  function jugador(i) { return estado.jugadores[i]; }
  function actual() { return jugador(estado.actual); }
  // Quién coloca su flota: en un móvil, el jugador del turno; con otro móvil, yo
  function colocando() { return red ? red.yo : actual(); }
  function rival() { return jugador(1 - estado.actual); }

  function cuadros(n) {
    var r = [];
    for (var i = 0; i < n; i++) r.push(h('i'));
    return h('span', { clase: 'cuadros' }, r);
  }

  var barra = P.barra;

  // ---------- Tablero ----------
  // opciones: { jugador, verBarcos, tam: 'grande'|'pequeno', alPulsar, seleccionado, ultimo, invalida }
  function tablero(op) {
    var j = op.jugador;
    var clase = 'tablero ' + (op.tam || 'grande') + (op.alPulsar ? ' activo' : '');
    var hijos = [h('span', { clase: 'coord' })];
    for (var k = 0; k < F.LADO; k++) hijos.push(h('span', { clase: 'coord', texto: String(k + 1) }));

    // Mapa casilla -> {barco, posición}
    var mapa = {};
    j.barcos.forEach(function (b) {
      b.celdas.forEach(function (c, i) { mapa[c] = { barco: b, i: i }; });
    });

    for (var f = 0; f < F.LADO; f++) {
      hijos.push(h('span', { clase: 'coord', texto: F.LETRAS.charAt(f) }));
      for (var col = 0; col < F.LADO; col++) {
        var c = f * F.LADO + col;
        var clases = ['celda'];
        var m = mapa[c];
        var disparo = j.disparos[c];
        var hundido = m && F.hundido(m.barco);
        if (m && (op.verBarcos || hundido)) {
          clases.push('barco', m.barco.horizontal ? 'b-h' : 'b-v');
          if (m.i === 0) clases.push('b-ini');
          if (m.i === m.barco.largo - 1) clases.push('b-fin');
          if (op.seleccionado && m.barco.id === op.seleccionado) clases.push('seleccionado');
        }
        if (disparo === 'agua') clases.push('agua');
        if (disparo === 'tocado') clases.push('tocado');
        if (disparo === 'tocado' && hundido) clases.push('hundido');
        if (op.ultimo === c) clases.push('ultimo');
        if (op.invalida === c) clases.push('invalida');
        var attrs = { clase: clases.join(' '), 'aria-label': F.nombreCasilla(c) };
        if (op.alPulsar) attrs.alClick = op.alPulsar.bind(null, c);
        hijos.push(h('span', attrs));
      }
    }
    return h('div', { clase: clase }, hijos);
  }

  // ---------- Render ----------
  function pintar() {
    raiz.innerHTML = '';
    if (red) {
      pintarRed();
      window.scrollTo(0, 0);
      return;
    }
    var fases = { inicio: pInicio, reanudar: pInicio, pase: pPase, colocar: pColocar, disparar: pDisparar, fin: pFin };
    (fases[estado.fase] || pInicio)();
    window.scrollTo(0, 0);
  }

  // Inicio: nombres, marcador y reglas
  function pInicio() {
    var n = nombres();
    var m = marcador();
    var enCurso = estado.fase === 'reanudar' && !!estado.jugadores;

    var in1 = h('input', { id: 'nombre1', maxlength: '14', value: n[0], autocomplete: 'off' });
    var in2 = h('input', { id: 'nombre2', maxlength: '14', value: n[1], autocomplete: 'off' });
    function leerNombres() {
      var a = in1.value.trim() || 'Jugador 1';
      var b = in2.value.trim() || 'Jugador 2';
      if (a === b) b = b + ' (2)';
      escribir(CLAVE_NOMBRES, [a, b]);
      return [a, b];
    }
    function actualizarVictorias() {
      var a = in1.value.trim() || 'Jugador 1';
      var b = in2.value.trim() || 'Jugador 2';
      v1.firstChild.textContent = String(m[a] || 0);
      v1.lastChild.textContent = a;
      v2.firstChild.textContent = String(m[b] || 0);
      v2.lastChild.textContent = b;
    }
    in1.addEventListener('input', actualizarVictorias);
    in2.addEventListener('input', actualizarVictorias);

    var v1 = h('div', null, [h('div', { clase: 'num', texto: '0' }), h('div', { clase: 'quien', texto: '' })]);
    var v2 = h('div', null, [h('div', { clase: 'num', texto: '0' }), h('div', { clase: 'quien', texto: '' })]);

    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'tarjeta' }, [
      h('div', { clase: 'campo' }, [h('label', { for: 'nombre1', texto: 'Jugador 1' }), in1]),
      h('div', { clase: 'campo' }, [h('label', { for: 'nombre2', texto: 'Jugador 2' }), in2])
    ]));
    raiz.appendChild(h('div', { clase: 'tarjeta' }, [
      h('h2', { clase: 'centro', texto: 'Victorias' }),
      h('div', { clase: 'victorias' }, [v1, v2])
    ]));
    raiz.appendChild(h('div', { clase: 'tarjeta' }, [
      h('p', { clase: 'reglas' }, [
        'Cada uno coloca ', h('b', { texto: '5 barcos' }), ' (de 5, 4, 3, 3 y 2 casillas) ',
        'sin que se toquen, ni en diagonal. Luego os turnáis para disparar: ',
        h('b', { texto: 'si aciertas, vuelves a disparar' }), '; si es agua, pasas el móvil. ',
        'Gana quien hunda antes toda la flota del otro.'
      ])
    ]));
    actualizarVictorias();

    var botones = [];
    if (enCurso) {
      botones.push(h('button', { clase: 'boton', texto: 'Continuar partida', alClick: reanudar }));
    }
    botones.push(h('button', { clase: 'boton' + (enCurso ? ' secundario' : ''), texto: enCurso ? 'Nueva partida' : 'Empezar', alClick: function () {
      nuevaPartida(leerNombres());
    } }));
    raiz.appendChild(h('div', { clase: 'acciones' }, botones));
    raiz.appendChild(h('div', { clase: 'acciones' }, [
      h('button', { clase: 'boton secundario', texto: '📶 Jugar con otro móvil', alClick: entrarCerca })
    ]));
  }

  function nuevaPartida(n) {
    var empieza = leer(CLAVE_EMPIEZA, 0) === 1 ? 1 : 0;
    estado = {
      fase: 'pase',
      siguiente: 'colocar',
      jugadores: [F.nuevoJugador(n[0]), F.nuevoJugador(n[1])],
      actual: 0,
      empieza: empieza,
      stats: [{ disparos: 0, aciertos: 0 }, { disparos: 0, aciertos: 0 }],
      ultimo: -1,
      mensaje: null,
      esperandoPase: false,
      ganador: null
    };
    escribir(CLAVE_EMPIEZA, 1 - empieza); // la próxima partida empieza el otro
    guardar();
    pintar();
  }

  // Pantalla tapada para pasar el móvil
  function pPase() {
    var j = actual();
    var colocar = estado.siguiente === 'colocar';
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'pase' }, [
      h('div', { clase: 'icono', texto: colocar ? '⚓' : '🎯' }),
      h('div', { clase: 'suave', texto: 'Pasa el móvil a' }),
      h('div', { clase: 'quien', texto: j.nombre }),
      h('div', { clase: 'suave', texto: colocar
        ? 'Va a colocar su flota. Que el otro jugador no mire.'
        : 'Le toca disparar. Que el otro jugador no mire la pantalla.' }),
      h('button', { clase: 'boton', texto: 'Soy ' + j.nombre + ', ¡listo!', alClick: function () {
        estado.fase = estado.siguiente;
        ui.sel = null;
        ui.ayuda = '';
        ui.ayudaError = false;
        ui.confirmarAbandono = false;
        if (estado.fase === 'colocar') ui.sel = primerSinColocar();
        guardar();
        pintar();
      } })
    ]));
  }

  // ---------- Colocación ----------
  function defDe(id) {
    for (var i = 0; i < F.FLOTA.length; i++) if (F.FLOTA[i].id === id) return F.FLOTA[i];
    return null;
  }
  function barcoPorId(j, id) {
    for (var i = 0; i < j.barcos.length; i++) if (j.barcos[i].id === id) return j.barcos[i];
    return null;
  }
  function primerSinColocar() {
    var j = colocando();
    for (var i = 0; i < F.FLOTA.length; i++) if (!barcoPorId(j, F.FLOTA[i].id)) return F.FLOTA[i].id;
    return null;
  }
  // Casillas del barco empezando en c, desplazado si hace falta para que no se salga
  function celdasAjustadas(c, largo, horizontal) {
    var f = F.fila(c), k = F.col(c);
    if (horizontal) k = Math.min(k, F.LADO - largo);
    else f = Math.min(f, F.LADO - largo);
    return F.celdasDe(f * F.LADO + k, largo, horizontal);
  }
  function quitarBarco(j, id) {
    j.barcos = j.barcos.filter(function (b) { return b.id !== id; });
  }
  function avisar(texto, error, casilla) {
    ui.ayuda = texto;
    ui.ayudaError = !!error;
    ui.invalida = casilla === undefined ? -1 : casilla;
    if (error) vibrar(40);
  }

  function girar(b) {
    var j = colocando();
    var h2 = !b.horizontal;
    var celdas = celdasAjustadas(b.celdas[0], b.largo, h2);
    if (F.sePuedeColocar(j.barcos, celdas, b.id)) {
      b.celdas = celdas;
      b.horizontal = h2;
      ui.horizontal = h2;
      avisar('');
      return true;
    }
    avisar('No se puede girar ahí: tocaría otro barco', true, b.celdas[0]);
    return false;
  }

  function pulsarColocar(c) {
    var j = colocando();
    var b = F.barcoEn(j, c);
    if (b) {
      if (b.id === ui.sel) girar(b);
      else {
        ui.sel = b.id;
        ui.horizontal = b.horizontal;
        avisar('Toca otra casilla para moverlo, o el mismo barco para girarlo');
      }
      guardar();
      pintar();
      return;
    }
    if (!ui.sel) {
      avisar('Toca un barco para moverlo o girarlo');
      pintar();
      return;
    }
    var def = defDe(ui.sel);
    var celdas = celdasAjustadas(c, def.largo, ui.horizontal);
    if (!F.sePuedeColocar(j.barcos, celdas, def.id)) {
      avisar('No cabe ahí: los barcos no pueden tocarse', true, c);
      pintar();
      return;
    }
    quitarBarco(j, def.id);
    j.barcos.push(F.barcoNuevo(def, celdas, ui.horizontal));
    vibrar(10);
    ui.sel = primerSinColocar();
    avisar(ui.sel ? '' : '¡Flota colocada! Toca un barco para moverlo o girarlo');
    guardar();
    pintar();
  }

  function pColocar() {
    var j = colocando();
    raiz.appendChild(barra('Tu flota'));
    raiz.appendChild(h('div', { clase: 'cabecera' }, [
      h('span', { clase: 'quien', texto: j.nombre }),
      h('span', { clase: 'suave', texto: j.barcos.length + ' de ' + F.FLOTA.length + ' barcos' })
    ]));

    // Barcos para elegir
    raiz.appendChild(h('div', { clase: 'barcos' }, F.FLOTA.map(function (def) {
      var puesto = !!barcoPorId(j, def.id);
      return h('button', {
        clase: 'chip' + (ui.sel === def.id ? ' activo' : '') + (puesto ? ' puesto' : ''),
        alClick: function () {
          ui.sel = def.id;
          var b = barcoPorId(j, def.id);
          if (b) ui.horizontal = b.horizontal;
          avisar(b ? 'Toca otra casilla para moverlo, o el barco para girarlo' : 'Toca el tablero para colocarlo');
          pintar();
        }
      }, [h('span', { clase: 'nombre', texto: def.nombre }), cuadros(def.largo)]);
    })));

    // Orientación
    var seg = h('div', { clase: 'segmentos' }, [
      h('button', { clase: ui.horizontal ? 'activo' : '', texto: '↔ Horizontal', alClick: function () { orientar(true); } }),
      h('button', { clase: ui.horizontal ? '' : 'activo', texto: '↕ Vertical', alClick: function () { orientar(false); } })
    ]);
    raiz.appendChild(seg);

    raiz.appendChild(tablero({
      jugador: j,
      verBarcos: true,
      tam: 'grande',
      alPulsar: pulsarColocar,
      seleccionado: ui.sel,
      invalida: ui.invalida
    }));
    ui.invalida = -1;

    var texto = ui.ayuda;
    if (!texto && ui.sel) {
      var nombreSel = defDe(ui.sel).nombre.toLowerCase();
      texto = barcoPorId(j, ui.sel)
        ? 'Toca otra casilla para mover el ' + nombreSel + ', o tócalo para girarlo'
        : 'Toca el tablero para colocar el ' + nombreSel;
    }
    raiz.appendChild(h('p', { clase: 'ayuda' + (ui.ayudaError ? ' error' : ''), texto: texto }));

    raiz.appendChild(h('div', { clase: 'acciones' }, [
      h('button', { clase: 'boton secundario', texto: '🎲 Al azar', alClick: function () {
        j.barcos = F.flotaAleatoria();
        ui.sel = null;
        avisar('Toca un barco para moverlo o girarlo');
        guardar();
        pintar();
      } }),
      h('button', { clase: 'boton secundario', texto: 'Borrar', alClick: function () {
        j.barcos = [];
        ui.sel = primerSinColocar();
        avisar('');
        guardar();
        pintar();
      } })
    ]));
    var listo = h('button', { clase: 'boton', texto: '¡Flota lista!', alClick: flotaLista });
    listo.disabled = !F.flotaCompleta(j);
    raiz.appendChild(h('div', { clase: 'acciones' }, [listo]));
  }

  function orientar(horizontal) {
    ui.horizontal = horizontal;
    var b = ui.sel && barcoPorId(colocando(), ui.sel);
    if (b && b.horizontal !== horizontal) girar(b);
    guardar();
    pintar();
  }

  function flotaLista() {
    if (!F.flotaCompleta(colocando())) return;
    if (red) return redFlotaLista();
    if (estado.actual === 0) {
      estado.actual = 1;
      estado.siguiente = 'colocar';
    } else {
      estado.actual = estado.empieza;
      estado.siguiente = 'disparar';
    }
    estado.fase = 'pase';
    guardar();
    pintar();
  }

  // ---------- Batalla ----------
  function pulsarDisparo(c) {
    if (estado.esperandoPase || estado.fase !== 'disparar') return;
    var r = F.disparar(rival(), c);
    if (r.tipo === 'repetido') return;

    var st = estado.stats[estado.actual];
    st.disparos++;
    estado.ultimo = c;
    var casilla = F.nombreCasilla(c);

    if (r.tipo === 'agua') {
      estado.mensaje = { tipo: 'agua', texto: casilla + ': ¡Agua!' };
      estado.esperandoPase = true;
      vibrar(15);
    } else if (r.tipo === 'tocado') {
      st.aciertos++;
      estado.mensaje = { tipo: 'tocado', texto: casilla + ': ¡Tocado! Vuelve a disparar' };
      vibrar(60);
    } else {
      st.aciertos++;
      estado.mensaje = { tipo: 'hundido', texto: '¡' + r.barco.nombre + ' hundido!' };
      vibrar(r.fin ? 400 : 220);
    }

    if (r.fin) {
      estado.ganador = estado.actual;
      var m = marcador();
      var nombre = actual().nombre;
      m[nombre] = (m[nombre] || 0) + 1;
      escribir(CLAVE_MARCADOR, m);
      guardar();
      // Un momento para ver el último hundido antes de la pantalla final
      pintar();
      clearTimeout(temporizador);
      temporizador = setTimeout(function () {
        estado.fase = 'fin';
        guardar();
        pintar();
      }, 1300);
      return;
    }
    guardar();
    pintar();
  }

  function pasarTurno() {
    estado.actual = 1 - estado.actual;
    estado.esperandoPase = false;
    estado.mensaje = null;
    estado.ultimo = -1;
    estado.siguiente = 'disparar';
    estado.fase = 'pase';
    guardar();
    pintar();
  }

  function pDisparar() {
    var yo = actual();
    var el = rival();
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'cabecera' }, [
      h('span', { clase: 'quien', texto: 'Dispara ' + yo.nombre }),
      h('span', { clase: 'suave', texto: 'Flota de ' + el.nombre })
    ]));

    var terminado = estado.ganador !== null && estado.ganador !== undefined;
    raiz.appendChild(tablero({
      jugador: el,
      verBarcos: false,
      tam: 'grande',
      alPulsar: estado.esperandoPase || terminado ? null : pulsarDisparo,
      ultimo: estado.ultimo
    }));

    var msj = estado.mensaje || { tipo: 'info', texto: 'Toca una casilla para disparar' };
    raiz.appendChild(h('div', { clase: 'mensaje ' + msj.tipo, texto: msj.texto }));

    if (estado.esperandoPase) {
      raiz.appendChild(h('div', { clase: 'acciones' }, [
        h('button', { clase: 'boton', texto: 'Pasar el móvil a ' + el.nombre, alClick: pasarTurno })
      ]));
    }

    // Abajo: mi flota en pequeño y lista de barcos enemigos
    raiz.appendChild(h('div', { clase: 'abajo' }, [
      h('div', null, [
        h('h2', { texto: 'Tu flota' }),
        tablero({ jugador: yo, verBarcos: true, tam: 'pequeno' })
      ]),
      h('div', null, [
        h('h2', { texto: 'Barcos de ' + el.nombre }),
        h('ul', { clase: 'lista-enemiga' }, el.barcos.slice().sort(function (a, b) { return b.largo - a.largo; }).map(function (b) {
          return h('li', { clase: F.hundido(b) ? 'hundido' : '' }, [h('span', { texto: b.nombre }), cuadros(b.largo)]);
        }))
      ])
    ]));

    if (!terminado) {
      raiz.appendChild(h('button', {
        clase: 'boton peligro' + (ui.confirmarAbandono ? ' confirmar' : ''),
        texto: ui.confirmarAbandono ? '¿Seguro? Toca otra vez para abandonar' : 'Abandonar partida',
        alClick: function () {
          if (!ui.confirmarAbandono) {
            ui.confirmarAbandono = true;
            pintar();
            clearTimeout(temporizador);
            temporizador = setTimeout(function () { ui.confirmarAbandono = false; if (estado.fase === 'disparar') pintar(); }, 3000);
            return;
          }
          ui.confirmarAbandono = false;
          estado = { fase: 'inicio' };
          guardar();
          pintar();
        }
      }));
    }
  }

  // ---------- Final ----------
  function pFin() {
    var g = jugador(estado.ganador);
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'trofeo', texto: '🏆' }));
    raiz.appendChild(h('div', { clase: 'ganador', texto: '¡Gana ' + g.nombre + '!' }));

    var m = marcador();
    raiz.appendChild(h('div', { clase: 'dos' }, [0, 1].map(function (i) {
      var j = jugador(i);
      var st = estado.stats[i];
      var prec = st.disparos ? Math.round(st.aciertos * 100 / st.disparos) : 0;
      return h('div', { clase: 'tarjeta' }, [
        h('h2', { texto: (i === estado.ganador ? '🏆 ' : '') + j.nombre }),
        h('div', { clase: 'stat', texto: 'Su flota:' }),
        tablero({ jugador: j, verBarcos: true, tam: 'pequeno' }),
        h('div', { clase: 'stat' }, [
          'Sus disparos: ', h('b', { texto: String(st.disparos) }), h('br'),
          'Aciertos: ', h('b', { texto: st.aciertos + ' (' + prec + '%)' }), h('br'),
          'Victorias: ', h('b', { texto: String(m[j.nombre] || 0) })
        ])
      ]);
    })));

    raiz.appendChild(h('div', { clase: 'acciones' }, [
      h('button', { clase: 'boton', texto: 'Revancha', alClick: function () {
        nuevaPartida([jugador(0).nombre, jugador(1).nombre]);
      } }),
      h('button', { clase: 'boton secundario', texto: 'Salir', alClick: function () {
        estado = { fase: 'inicio' };
        guardar();
        pintar();
      } })
    ]));
  }

  // Continúa una partida a medias. Siempre se vuelve a la pantalla tapada,
  // para no enseñar la flota de nadie a quien no le toca.
  function reanudar() {
    if (estado.faseAntes === 'disparar') {
      if (estado.esperandoPase) {
        // Había fallado y faltaba pasar el móvil: le toca al otro
        estado.actual = 1 - estado.actual;
        estado.esperandoPase = false;
      }
      estado.mensaje = null;
      estado.ultimo = -1;
      estado.siguiente = 'disparar';
    } else if (estado.faseAntes === 'colocar') {
      estado.siguiente = 'colocar';
    }
    delete estado.faseAntes;
    estado.fase = 'pase';
    guardar();
    pintar();
  }

  // ---------- Con otro móvil cercano (cerca.js) ----------
  // Cada uno coloca su flota en su móvil y solo sabe de la del otro lo que
  // le contestan sus disparos. Mensajes:
  //   { t: 'lista' }                     mi flota está colocada
  //   { t: 'empieza', anfitrion }        (lo manda quien creó la partida) quién dispara primero
  //   { t: 'disparo', c }                disparo a la casilla c
  //   { t: 'resultado', c, tipo, barco, aguaAuto, fin, flota }  respuesta al disparo
  //   { t: 'flota', barcos }             al acabar, el ganador enseña su flota
  //   { t: 'revancha' }                  quiere jugar otra
  // No se guarda: si se corta la conexión, la partida se pierde.
  var red = null;

  function entrarCerca() {
    var sala = Cerca.abrir({
      juego: 'flota',
      alConectar: function (info) {
        red = {
          sala: sala,
          anfitrion: info.anfitrion,
          rival: info.rival,
          nombre: sala.nombre,
          marcador: { yo: 0, el: 0 },
          empiezaAnfitrion: true
        };
        redRonda();
      },
      alMensaje: redMensaje,
      alCerrar: function () {
        red = null;
        ui.confirmarAbandono = false;
        pintar();
      }
    });
  }

  // Prepara una partida nueva con el mismo rival
  function redRonda() {
    red.yo = F.nuevoJugador(red.nombre);
    red.el = F.nuevoJugador(red.rival); // lo que sé de su flota: mis disparos y sus barcos hundidos
    red.fase = 'colocar';
    red.listoYo = red.listoEl = false;
    red.miTurno = false;
    red.esperando = false; // he disparado y espero la respuesta
    red.mensaje = null;
    red.ultimo = -1;       // mi último disparo
    red.ultimoSuyo = -1;   // su último disparo
    red.stats = { disparos: 0, aciertos: 0 };
    red.statsEl = { disparos: 0, aciertos: 0 };
    red.ganador = null;    // 'yo' o 'el'
    red.revanchaYo = red.revanchaEl = false;
    ui.sel = F.FLOTA[0].id;
    ui.horizontal = true;
    ui.ayuda = '';
    ui.ayudaError = false;
    ui.confirmarAbandono = false;
    pintar();
  }

  function redEnviar(m) { if (red) red.sala.enviar(m); }

  function redFlotaLista() {
    red.listoYo = true;
    red.fase = 'esperaFlota';
    redEnviar({ t: 'lista' });
    redQuizaEmpezar();
    pintar();
  }

  // Quien creó la partida decide quién empieza, alternando en cada revancha
  function redQuizaEmpezar() {
    if (!red.anfitrion || !red.listoYo || !red.listoEl || red.fase !== 'esperaFlota') return;
    var empiezo = red.empiezaAnfitrion;
    red.empiezaAnfitrion = !red.empiezaAnfitrion;
    redEnviar({ t: 'empieza', anfitrion: empiezo });
    redBatalla(empiezo);
  }

  function redBatalla(miTurno) {
    red.fase = 'disparar';
    red.miTurno = miTurno;
    red.mensaje = { tipo: 'info', texto: miTurno ? 'Empiezas tú: toca una casilla para disparar' : 'Empieza ' + red.rival };
    vibrar(30);
    pintar();
  }

  function redMensaje(m) {
    if (!red || !m) return;
    if (m.t === 'lista') {
      red.listoEl = true;
      redQuizaEmpezar();
      if (red.fase !== 'disparar') pintar();
    } else if (m.t === 'noLista') {
      red.listoEl = false;
      if (red.fase === 'esperaFlota') pintar();
    } else if (m.t === 'empieza' && !red.anfitrion && red.fase === 'esperaFlota') {
      redBatalla(!m.anfitrion);
    } else if (m.t === 'disparo') {
      redRecibirDisparo(m.c);
    } else if (m.t === 'resultado') {
      redResultado(m);
    } else if (m.t === 'flota' && Array.isArray(m.barcos)) {
      red.el.barcos = m.barcos;
      pintar();
    } else if (m.t === 'revancha') {
      red.revanchaEl = true;
      if (red.revanchaYo) redRonda();
      else pintar();
    }
  }

  function redDisparar(c) {
    if (!red || red.fase !== 'disparar' || !red.miTurno || red.esperando || red.el.disparos[c]) return;
    red.esperando = true;
    red.ultimo = c;
    redEnviar({ t: 'disparo', c: c });
    red.mensaje = { tipo: 'info', texto: 'Disparo a ' + F.nombreCasilla(c) + '…' };
    pintar();
  }

  // El otro me dispara: lo compruebo en mi flota y le contesto
  function redRecibirDisparo(c) {
    if (red.fase !== 'disparar' || red.miTurno || !(c >= 0 && c < F.TOTAL)) return;
    var r = F.disparar(red.yo, c);
    if (r.tipo === 'repetido') return redEnviar({ t: 'resultado', c: c, tipo: 'repetido', aguaAuto: [] });
    red.statsEl.disparos++;
    if (r.tipo !== 'agua') red.statsEl.aciertos++;
    red.ultimoSuyo = c;
    var resp = { t: 'resultado', c: c, tipo: r.tipo, aguaAuto: r.aguaAuto, fin: r.fin };
    if (r.barco && r.tipo === 'hundido') resp.barco = r.barco;
    if (r.fin) resp.flota = red.yo.barcos; // ha ganado: que vea toda mi flota
    redEnviar(resp);

    var casilla = F.nombreCasilla(c);
    if (r.tipo === 'agua') {
      red.miTurno = true;
      red.mensaje = { tipo: 'agua', texto: red.rival + ' dispara a ' + casilla + ': agua. ¡Te toca!' };
      vibrar(15);
    } else if (r.tipo === 'tocado') {
      red.mensaje = { tipo: 'tocado', texto: red.rival + ' te da en ' + casilla + ': ¡tocado!' };
      vibrar(60);
    } else {
      red.mensaje = { tipo: 'hundido', texto: red.rival + ' te ha hundido el ' + r.barco.nombre.toLowerCase() };
      vibrar(r.fin ? 400 : 220);
    }
    if (r.fin) return redFin('el');
    pintar();
  }

  // Me contestan a mi disparo
  function redResultado(m) {
    if (red.fase !== 'disparar' || !red.esperando || m.c !== red.ultimo) return;
    red.esperando = false;
    if (m.tipo === 'repetido') return pintar();
    var c = m.c;
    red.stats.disparos++;
    red.el.disparos[c] = m.tipo === 'agua' ? 'agua' : 'tocado';
    (m.aguaAuto || []).forEach(function (a) { if (!red.el.disparos[a]) red.el.disparos[a] = 'agua'; });
    var casilla = F.nombreCasilla(c);
    if (m.tipo === 'agua') {
      red.miTurno = false;
      red.mensaje = { tipo: 'agua', texto: casilla + ': ¡Agua! Le toca a ' + red.rival };
      vibrar(15);
    } else if (m.tipo === 'tocado') {
      red.stats.aciertos++;
      red.mensaje = { tipo: 'tocado', texto: casilla + ': ¡Tocado! Vuelve a disparar' };
      vibrar(60);
    } else {
      red.stats.aciertos++;
      if (m.barco) {
        var b = m.barco;
        b.tocados = b.largo;
        red.el.barcos.push(b);
      }
      red.mensaje = { tipo: 'hundido', texto: '¡' + (m.barco ? m.barco.nombre : 'Barco') + ' hundido!' };
      vibrar(m.fin ? 400 : 220);
    }
    if (m.fin) {
      if (Array.isArray(m.flota)) red.el.barcos = m.flota;
      redEnviar({ t: 'flota', barcos: red.yo.barcos });
      return redFin('yo');
    }
    pintar();
  }

  function redFin(ganador) {
    red.ganador = ganador;
    red.marcador[ganador]++;
    red.miTurno = false;
    // Un momento para ver el último disparo antes de la pantalla final
    pintar();
    var esta = red;
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      if (red !== esta || red.ganador !== ganador) return;
      red.fase = 'fin';
      pintar();
    }, 1300);
  }

  function redSalir() {
    if (!red) return;
    var s = red.sala;
    red = null;
    s.cerrar();
    pintar();
  }

  // ---------- Pantallas con otro móvil ----------
  function pintarRed() {
    if (red.fase === 'colocar') return pColocar();
    if (red.fase === 'esperaFlota') return pRedEspera();
    if (red.fase === 'fin') return pRedFin();
    pRedDisparar();
  }

  function pRedEspera() {
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'pase' }, [
      h('div', { clase: 'icono', texto: '⚓' }),
      h('div', { clase: 'quien', texto: '¡Flota lista!' }),
      h('div', { clase: 'suave', texto: red.listoEl
        ? 'Empezando…'
        : 'Esperando a que ' + red.rival + ' coloque su flota…' }),
      h('div', { style: 'width:60%;max-width:220px' }, [tablero({ jugador: red.yo, verBarcos: true, tam: 'pequeno' })]),
      h('button', { clase: 'boton secundario', texto: 'Cambiar mi flota', alClick: function () {
        red.listoYo = false;
        red.fase = 'colocar';
        redEnviar({ t: 'noLista' });
        pintar();
      } })
    ]));
  }

  function pRedDisparar() {
    var yo = red.yo;
    var el = red.el;
    var terminado = !!red.ganador;
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'cabecera' }, [
      h('span', { clase: 'quien', texto: terminado ? (red.ganador === 'yo' ? '¡Has ganado!' : 'Gana ' + red.rival)
        : red.miTurno ? 'Te toca disparar' : 'Dispara ' + red.rival + '…' }),
      h('span', { clase: 'suave', texto: 'Flota de ' + red.rival })
    ]));

    raiz.appendChild(tablero({
      jugador: el,
      verBarcos: false,
      tam: 'grande',
      alPulsar: red.miTurno && !red.esperando && !terminado ? redDisparar : null,
      ultimo: red.ultimo
    }));

    var msj = red.mensaje || { tipo: 'info', texto: red.miTurno ? 'Toca una casilla para disparar' : 'Espera tu turno' };
    raiz.appendChild(h('div', { clase: 'mensaje ' + msj.tipo, texto: msj.texto }));

    var hundidos = {};
    el.barcos.forEach(function (b) { if (F.hundido(b)) hundidos[b.id] = true; });
    raiz.appendChild(h('div', { clase: 'abajo' }, [
      h('div', null, [
        h('h2', { texto: 'Tu flota' }),
        tablero({ jugador: yo, verBarcos: true, tam: 'pequeno', ultimo: red.ultimoSuyo })
      ]),
      h('div', null, [
        h('h2', { texto: 'Barcos de ' + red.rival }),
        h('ul', { clase: 'lista-enemiga' }, F.FLOTA.slice().sort(function (a, b) { return b.largo - a.largo; }).map(function (b) {
          return h('li', { clase: hundidos[b.id] ? 'hundido' : '' }, [h('span', { texto: b.nombre }), cuadros(b.largo)]);
        }))
      ])
    ]));

    if (!terminado) {
      raiz.appendChild(h('button', {
        clase: 'boton peligro' + (ui.confirmarAbandono ? ' confirmar' : ''),
        texto: ui.confirmarAbandono ? '¿Seguro? Toca otra vez para salir' : 'Salir de la partida',
        alClick: function () {
          if (!ui.confirmarAbandono) {
            ui.confirmarAbandono = true;
            pintar();
            clearTimeout(temporizador);
            temporizador = setTimeout(function () { ui.confirmarAbandono = false; if (red && red.fase === 'disparar') pintar(); }, 3000);
            return;
          }
          ui.confirmarAbandono = false;
          redSalir();
        }
      }));
    }
  }

  function pRedFin() {
    var gano = red.ganador === 'yo';
    raiz.appendChild(barra('Hundir la flota'));
    raiz.appendChild(h('div', { clase: 'trofeo', texto: gano ? '🏆' : '⚓' }));
    raiz.appendChild(h('div', { clase: 'ganador', texto: gano ? '¡Has ganado!' : '¡Gana ' + red.rival + '!' }));
    raiz.appendChild(h('div', { clase: 'centro suave', texto: 'Marcador: tú ' + red.marcador.yo + ' – ' + red.marcador.el + ' ' + red.rival }));

    raiz.appendChild(h('div', { clase: 'dos' }, [
      { titulo: 'Tú', j: red.yo, st: red.stats, gana: gano },
      { titulo: red.rival, j: red.el, st: red.statsEl, gana: !gano }
    ].map(function (x) {
      var prec = x.st.disparos ? Math.round(x.st.aciertos * 100 / x.st.disparos) : 0;
      return h('div', { clase: 'tarjeta' }, [
        h('h2', { texto: (x.gana ? '🏆 ' : '') + x.titulo }),
        h('div', { clase: 'stat', texto: x.j === red.yo ? 'Tu flota:' : 'Su flota:' }),
        tablero({ jugador: x.j, verBarcos: true, tam: 'pequeno' }),
        h('div', { clase: 'stat' }, [
          x.j === red.yo ? 'Tus disparos: ' : 'Sus disparos: ', h('b', { texto: String(x.st.disparos) }), h('br'),
          'Aciertos: ', h('b', { texto: x.st.aciertos + ' (' + prec + '%)' })
        ])
      ]);
    })));

    var revancha = h('button', {
      clase: 'boton',
      texto: red.revanchaYo ? 'Esperando a ' + red.rival + '…' : red.revanchaEl ? red.rival + ' quiere la revancha: ¡vamos!' : 'Revancha',
      alClick: function () {
        if (red.revanchaYo) return;
        red.revanchaYo = true;
        redEnviar({ t: 'revancha' });
        if (red.revanchaEl) redRonda();
        else pintar();
      }
    });
    revancha.disabled = red.revanchaYo;
    raiz.appendChild(h('div', { clase: 'acciones' }, [
      revancha,
      h('button', { clase: 'boton secundario', texto: 'Salir', alClick: redSalir })
    ]));
  }

  // ---------- Arranque ----------
  var hayGanador = estado.ganador !== null && estado.ganador !== undefined;
  if (estado.jugadores && hayGanador) {
    estado.fase = 'fin';
  } else if (estado.jugadores && ['pase', 'colocar', 'disparar', 'reanudar'].indexOf(estado.fase) >= 0) {
    if (estado.fase !== 'reanudar') estado.faseAntes = estado.fase;
    estado.fase = 'reanudar'; // muestra el inicio con "Continuar partida"
  } else {
    estado = { fase: 'inicio' };
  }
  guardar(); // deja al día la marca de "partida a medias" del menú
  pintar();
})();
