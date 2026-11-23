// Jugar con otro móvil que está cerca (Google Nearby Connections, en la app de Android).
// Un móvil crea la partida y el otro se une. Después los juegos se mandan
// mensajes (objetos JSON) con sala.enviar(...) y los reciben en alMensaje.
//
//   <script src="cerca.js"></script>   (después de plataforma.js)
//
//   var sala = Cerca.abrir({
//     juego: 'tresenraya',              // solo se encuentran móviles en el mismo juego
//     alConectar: function (info) { },  // info: { anfitrion: true|false, rival: 'Ana' }
//     alMensaje: function (m) { },      // lo que el otro mandó con sala.enviar(m)
//     alCerrar: function (motivo) { }   // 'cancelado' (no llegó a conectar) o 'desconectado'
//   });
//   sala.enviar({ t: 'jugada', i: 4 });
//   sala.cerrar();                       // corta sin avisar a alCerrar
//
// Mientras no hay conexión se ve una ventana encima del juego para crear o
// unirse; si la conexión se corta, la ventana avisa y luego llama a alCerrar.
// Sin la app de Android (en el navegador) explica que solo funciona en la app.
(function (raiz, crear) {
  var C = crear(raiz);
  if (typeof module === 'object' && module.exports) module.exports = C;
  else raiz.Cerca = C;
})(typeof window !== 'undefined' ? window : globalThis, function (raiz) {
  'use strict';

  var VERSION = 1; // sube si cambian los mensajes: los dos móviles deben tener la misma
  var SERVICIO = 'es.pablo.tresenraya.';
  var actual = null; // solo hay una sala abierta a la vez

  // Recibe los eventos de Java (MainActivity.avisarCerca)
  raiz.__cercaEvento = function (e) {
    if (actual) actual._evento(e);
  };

  // El puente con Android, con los mismos nombres que en MainActivity.Puente
  function transporteAndroid() {
    var A = raiz.Android;
    if (!A || !A.cercaAnunciar) return null;
    return {
      disponible: function () { try { return A.cercaDisponible(); } catch (e) { return false; } },
      anunciar: function (s, n) { A.cercaAnunciar(s, n); },
      buscar: function (s, n) { A.cercaBuscar(s, n); },
      conectar: function (id) { A.cercaConectar(id); },
      enviar: function (t) { A.cercaEnviar(t); },
      parar: function () { A.cercaParar(); },
      ajustes: function () { A.cercaAjustes(); }
    };
  }

  function disponible() {
    var t = transporteAndroid();
    return !!t && t.disponible();
  }

  var almacen = raiz.Plataforma ? raiz.Plataforma.almacen('cerca') : { leer: function (k, d) { return d; }, escribir: function () {} };

  function nombreGuardado() {
    var n = almacen.leer('nombre', '');
    return typeof n === 'string' ? n : '';
  }

  // ---------- La sala: conexión y saludo, sin pantalla ----------
  function Sala(op) {
    this.op = op;
    this.juego = op.juego;
    this.t = op.transporte || transporteAndroid();
    this.fase = 'inicio';   // inicio, esperando, buscando, conectando, saludando, conectada, cortada, error, permisos, cerrada
    this.encontrados = [];  // [{ id, nombre }]
    this.rival = '';
    this.anfitrion = false;
    this.nombre = nombreGuardado();
    this.error = '';
    this.saludoEnviado = false;
    this.saludoRecibido = false;
    this.cola = [];         // mensajes que llegan antes de terminar el saludo
    this.alCambiar = null;  // lo usa la ventana para repintarse
  }

  Sala.prototype.servicio = function () { return SERVICIO + this.juego; };

  Sala.prototype._fase = function (f) {
    this.fase = f;
    if (this.alCambiar) this.alCambiar();
  };

  Sala.prototype.crear = function (nombre) {
    this._prepararNombre(nombre);
    this.anfitrion = true;
    this._fase('esperando');
    this.t.anunciar(this.servicio(), this.nombre);
  };

  Sala.prototype.buscar = function (nombre) {
    this._prepararNombre(nombre);
    this.anfitrion = false;
    this.encontrados = [];
    this._fase('buscando');
    this.t.buscar(this.servicio(), this.nombre);
  };

  Sala.prototype.unirse = function (id) {
    this._fase('conectando');
    this.t.conectar(id);
  };

  Sala.prototype._prepararNombre = function (nombre) {
    nombre = String(nombre || '').trim().slice(0, 14);
    if (nombre) almacen.escribir('nombre', nombre);
    this.nombre = nombre || 'Jugador';
  };

  // Vuelve a la pantalla de crear o unirse (deja de anunciar o de buscar)
  Sala.prototype.volver = function () {
    this.t.parar();
    this.encontrados = [];
    this.error = '';
    this._fase('inicio');
  };

  Sala.prototype.enviar = function (m) {
    if (this.fase !== 'conectada') return false;
    this.t.enviar(JSON.stringify({ c: 'm', d: m }));
    return true;
  };

  Sala.prototype.conectada = function () { return this.fase === 'conectada'; };

  Sala.prototype.cerrar = function () {
    if (this.fase === 'cerrada') return;
    this.fase = 'cerrada';
    try { this.t.parar(); } catch (e) { /* nada */ }
    if (actual === this) actual = null;
    if (this.alCambiar) this.alCambiar();
  };

  Sala.prototype._saludar = function () {
    if (this.saludoEnviado) return;
    this.saludoEnviado = true;
    this.t.enviar(JSON.stringify({ c: 'hola', v: VERSION, juego: this.juego, nombre: this.nombre }));
  };

  Sala.prototype._fallo = function (texto) {
    this.t.parar();
    this.error = texto;
    this._fase('error');
  };

  Sala.prototype._evento = function (e) {
    if (!e || this.fase === 'cerrada') return;
    switch (e.tipo) {
      case 'encontrado':
        if (this.fase !== 'buscando') return;
        this.encontrados = this.encontrados.filter(function (x) { return x.id !== e.id; });
        this.encontrados.push({ id: e.id, nombre: e.nombre || 'Jugador' });
        this._fase('buscando');
        break;
      case 'perdido':
        this.encontrados = this.encontrados.filter(function (x) { return x.id !== e.id; });
        if (this.fase === 'buscando') this._fase('buscando');
        break;
      case 'conectado':
        if (this.fase === 'conectada') return;
        this.rival = e.nombre || this.rival || 'Jugador';
        this._fase('saludando');
        this._saludar();
        this._quizaListo();
        break;
      case 'mensaje':
        this._mensaje(e.texto);
        break;
      case 'desconectado':
        if (this.fase === 'conectada' || this.fase === 'saludando') {
          this.t.parar();
          this._fase('cortada');
        }
        break;
      case 'permisos':
        this.permisosAjustes = !!e.ajustes;
        this._fase('permisos');
        break;
      case 'error':
        if (this.fase === 'conectada') return; // un fallo suelto no corta la partida
        this._fallo(e.texto || 'Algo ha fallado. Probad otra vez.');
        break;
    }
  };

  Sala.prototype._mensaje = function (texto) {
    var m;
    try { m = JSON.parse(texto); } catch (err) { return; }
    if (!m) return;
    if (m.c === 'hola') {
      if (m.v !== VERSION) return this._fallo('El otro móvil tiene otra versión de la app. Actualizad los dos y probad otra vez.');
      if (m.juego !== this.juego) return this._fallo('El otro móvil está en otro juego.');
      if (m.nombre) this.rival = String(m.nombre).slice(0, 14);
      this.saludoRecibido = true;
      this._saludar();
      this._quizaListo();
    } else if (m.c === 'm') {
      if (this.fase === 'conectada') {
        if (this.op.alMensaje) this.op.alMensaje(m.d);
      } else {
        this.cola.push(m.d);
      }
    }
  };

  Sala.prototype._quizaListo = function () {
    if (this.fase === 'conectada' || !this.saludoEnviado || !this.saludoRecibido) return;
    this._fase('conectada');
    if (this.op.alConectar) this.op.alConectar({ anfitrion: this.anfitrion, rival: this.rival });
    var cola = this.cola;
    this.cola = [];
    for (var i = 0; i < cola.length && this.fase === 'conectada'; i++) {
      if (this.op.alMensaje) this.op.alMensaje(cola[i]);
    }
  };

  // Termina con el motivo para el juego ("cancelado" o "desconectado")
  Sala.prototype._terminar = function (motivo) {
    this.cerrar();
    if (this.op.alCerrar) this.op.alCerrar(motivo);
  };

  // ---------- La ventana ----------
  function h(etiqueta, attrs, hijos) {
    var e = raiz.document.createElement(etiqueta);
    for (var k in attrs || {}) {
      if (!attrs.hasOwnProperty(k) || attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
      if (k === 'texto') e.textContent = attrs[k];
      else if (k === 'clase') e.className = attrs[k];
      else if (k.indexOf('al') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (hijos || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? raiz.document.createTextNode(c) : c);
    });
    return e;
  }

  function ventana(sala) {
    var fondo = h('div', { clase: 'cerca-fondo', role: 'dialog', 'aria-modal': 'true' });
    var caja = h('div', { clase: 'cerca-caja' });
    fondo.appendChild(caja);
    raiz.document.body.appendChild(fondo);
    var nombreEscrito = sala.nombre;

    function boton(texto, accion, secundario) {
      return h('button', { clase: 'boton' + (secundario ? ' secundario' : ''), texto: texto, alClick: accion });
    }
    function cancelar() { sala._terminar('cancelado'); }

    function pintar() {
      if (sala.fase === 'cerrada' || sala.fase === 'conectada') {
        fondo.classList.add('oculto');
        if (sala.fase === 'cerrada' && fondo.parentNode) fondo.parentNode.removeChild(fondo);
        return;
      }
      fondo.classList.remove('oculto');
      caja.innerHTML = '';
      caja.appendChild(h('h2', { texto: '📶 Jugar con otro móvil' }));
      var f = sala.fase;

      if (!sala.t) {
        caja.appendChild(h('p', { texto: 'Esto solo funciona en la app de Android: los dos móviles se conectan por Bluetooth y wifi, sin internet.' }));
        caja.appendChild(h('div', { clase: 'acciones' }, [boton('Volver', cancelar, true)]));
        return;
      }

      if (f === 'inicio') {
        var campo = h('input', { maxlength: '14', value: nombreEscrito, placeholder: 'Tu nombre', autocomplete: 'off', 'aria-label': 'Tu nombre' });
        campo.addEventListener('input', function () { nombreEscrito = campo.value; });
        caja.appendChild(h('p', { texto: 'Abrid este juego en los dos móviles, con Bluetooth y wifi encendidos. Uno crea la partida y el otro se une.' }));
        caja.appendChild(h('label', { clase: 'cerca-campo' }, [h('span', { texto: 'Tu nombre' }), campo]));
        caja.appendChild(h('div', { clase: 'cerca-botones' }, [
          boton('Crear partida', function () { sala.crear(campo.value); }),
          boton('Unirme a una partida', function () { sala.buscar(campo.value); }),
          boton('Cancelar', cancelar, true)
        ]));
        return;
      }

      if (f === 'esperando') {
        caja.appendChild(h('div', { clase: 'cerca-espera' }, [h('span', { clase: 'cerca-giro' }), h('span', { texto: 'Esperando a que el otro móvil se una…' })]));
        caja.appendChild(h('p', { texto: 'En el otro móvil, entra en este mismo juego, elige jugar con otro móvil y toca "Unirme a una partida". Te verá como ' }, [h('b', { texto: sala.nombre }), '.']));
      } else if (f === 'buscando') {
        caja.appendChild(h('div', { clase: 'cerca-espera' }, [h('span', { clase: 'cerca-giro' }), h('span', { texto: sala.encontrados.length ? 'Partidas cerca:' : 'Buscando partidas cerca…' })]));
        if (sala.encontrados.length) {
          caja.appendChild(h('div', { clase: 'cerca-lista' }, sala.encontrados.map(function (x) {
            return h('button', { clase: 'boton secundario', texto: 'Jugar con ' + x.nombre, alClick: function () { sala.unirse(x.id); } });
          })));
        } else {
          caja.appendChild(h('p', { texto: 'En el otro móvil, entra en este mismo juego, elige jugar con otro móvil y toca "Crear partida".' }));
        }
      } else if (f === 'conectando' || f === 'saludando') {
        caja.appendChild(h('div', { clase: 'cerca-espera' }, [h('span', { clase: 'cerca-giro' }), h('span', { texto: 'Conectando' + (sala.rival ? ' con ' + sala.rival : '') + '…' })]));
      } else if (f === 'error') {
        caja.appendChild(h('p', { clase: 'cerca-error', texto: sala.error }));
        caja.appendChild(h('div', { clase: 'cerca-botones' }, [
          boton('Probar otra vez', function () { sala.volver(); }),
          boton('Cancelar', cancelar, true)
        ]));
        return;
      } else if (f === 'permisos') {
        caja.appendChild(h('p', { clase: 'cerca-error', texto: 'Para encontrar el otro móvil hace falta el permiso de "Dispositivos cercanos" (o de ubicación en móviles más antiguos).' }));
        var bs = [];
        if (sala.permisosAjustes) {
          caja.appendChild(h('p', { texto: 'Dalo en Ajustes > Permisos y vuelve aquí.' }));
          bs.push(boton('Abrir ajustes', function () { sala.t.ajustes(); }));
        }
        bs.push(boton('Probar otra vez', function () { sala.volver(); }, sala.permisosAjustes));
        bs.push(boton('Cancelar', cancelar, true));
        caja.appendChild(h('div', { clase: 'cerca-botones' }, bs));
        return;
      } else if (f === 'cortada') {
        caja.appendChild(h('p', { clase: 'cerca-error', texto: 'Se ha cortado la conexión con ' + (sala.rival || 'el otro móvil') + '.' }));
        caja.appendChild(h('p', { texto: 'Puede que se haya alejado, salido del juego o apagado el Bluetooth.' }));
        caja.appendChild(h('div', { clase: 'cerca-botones' }, [boton('Aceptar', function () { sala._terminar('desconectado'); })]));
        return;
      }
      caja.appendChild(h('div', { clase: 'cerca-botones' }, [
        boton('Atrás', function () { sala.volver(); }, true)
      ]));
    }

    sala.alCambiar = pintar;
    pintar();
  }

  function abrir(op) {
    if (actual) actual.cerrar();
    var sala = new Sala(op || {});
    actual = sala;
    if (raiz.document && raiz.document.body && sala.op.ventana !== false) ventana(sala);
    return sala;
  }

  // Al salir de la pantalla del juego se corta la conexión
  if (raiz.addEventListener) {
    raiz.addEventListener('pagehide', function () { if (actual) actual.cerrar(); });
  }

  return { abrir: abrir, disponible: disponible, VERSION: VERSION, Sala: Sala };
});
