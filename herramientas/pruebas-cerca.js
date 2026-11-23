// Pruebas de cerca.js (jugar con otro móvil): saludo, mensajes, versiones y cortes.
// Se simulan dos móviles unidos por un Nearby falso, sin pantalla.
// Uso: node herramientas/pruebas-cerca.js
'use strict';
var Cerca = require('../app/src/main/assets/cerca.js');

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) {
    fallos++;
    console.error('FALLO: ' + msg);
  }
}

// Dos salas unidas: lo que una envía le llega a la otra como evento "mensaje"
// cuando se llama a entregar() (como en la realidad, no al instante)
function pareja(juegoA, juegoB, opA, opB) {
  var log = { a: [], b: [] };
  var salas = {};
  var cola = [];
  function transporte(yo, otro) {
    return {
      anunciar: function () { salas[yo]._evento({ tipo: 'esperando' }); },
      buscar: function () { salas[yo]._evento({ tipo: 'buscando' }); },
      conectar: function () {},
      enviar: function (t) { log[yo].push(JSON.parse(t)); cola.push([otro, t]); },
      parar: function () { log[yo].push('parar'); },
      ajustes: function () {}
    };
  }
  function op(yo, extra) {
    var o = {
      juego: yo === 'a' ? juegoA : juegoB,
      ventana: false,
      transporte: transporte(yo, yo === 'a' ? 'b' : 'a'),
      conectado: null,
      mensajes: [],
      cerrado: null
    };
    o.alConectar = function (info) { o.conectado = info; };
    o.alMensaje = function (m) { o.mensajes.push(m); };
    o.alCerrar = function (motivo) { o.cerrado = motivo; };
    for (var k in extra || {}) o[k] = extra[k];
    return o;
  }
  var oa = op('a', opA), ob = op('b', opB);
  // Sala crea su propio objeto: hay que crearlas sin Cerca.abrir para tener dos a la vez
  salas.a = new Cerca.Sala(oa);
  salas.b = new Cerca.Sala(ob);
  function entregar() {
    while (cola.length) {
      var x = cola.shift();
      salas[x[0]]._evento({ tipo: 'mensaje', texto: x[1] });
    }
  }
  return { a: salas.a, b: salas.b, oa: oa, ob: ob, log: log, entregar: entregar };
}

// 1. Conexión normal: saludo y mensajes en los dos sentidos
(function () {
  var p = pareja('flota', 'flota');
  p.a.crear('Ana');
  comprobar(p.a.fase === 'esperando', 'el anfitrión espera');
  p.b.buscar('Beto');
  comprobar(p.b.fase === 'buscando', 'el otro busca');
  p.b._evento({ tipo: 'encontrado', id: 'x1', nombre: 'Ana' });
  p.b._evento({ tipo: 'encontrado', id: 'x1', nombre: 'Ana' });
  comprobar(p.b.encontrados.length === 1, 'no repite partidas encontradas');
  p.b.unirse('x1');
  comprobar(p.b.fase === 'conectando', 'conectando');
  // Nearby avisa a los dos
  p.a._evento({ tipo: 'conectado', nombre: 'Beto' });
  comprobar(p.a.fase === 'saludando', 'espera el saludo del otro');
  p.b._evento({ tipo: 'conectado', nombre: 'Ana' });
  comprobar(!p.a.conectada() && !p.b.conectada(), 'sin saludo no hay conexión');
  p.entregar();
  comprobar(p.a.conectada() && p.b.conectada(), 'los dos conectados tras saludarse');
  comprobar(p.oa.conectado && p.oa.conectado.anfitrion === true && p.oa.conectado.rival === 'Beto', 'el anfitrión sabe quién es el rival');
  comprobar(p.ob.conectado && p.ob.conectado.anfitrion === false && p.ob.conectado.rival === 'Ana', 'el invitado sabe quién es el rival');
  p.a.enviar({ t: 'disparo', c: 5 });
  p.b.enviar({ t: 'resultado', c: 5, tipo: 'agua' });
  p.entregar();
  comprobar(p.ob.mensajes.length === 1 && p.ob.mensajes[0].c === 5, 'llega el mensaje de A a B');
  comprobar(p.oa.mensajes.length === 1 && p.oa.mensajes[0].tipo === 'agua', 'llega el mensaje de B a A');
  // Corte
  p.b._evento({ tipo: 'desconectado' });
  comprobar(p.b.fase === 'cortada', 'avisa del corte');
  comprobar(p.ob.cerrado === null, 'espera a que se acepte el aviso');
  p.b._terminar('desconectado');
  comprobar(p.ob.cerrado === 'desconectado', 'el juego se entera del corte');
  comprobar(!p.b.enviar({ t: 'x' }), 'no se envía tras cerrar');
})();

// 2. Mensajes que llegan antes del aviso de conexión: se entregan una vez, en orden
(function () {
  var p = pareja('ppt', 'ppt');
  p.a.crear('Ana');
  p.b.buscar('Beto');
  p.b._evento({ tipo: 'conectado', nombre: 'Ana' }); // B saluda; A aún no sabe que está conectado
  // A recibe el saludo de B y un mensaje del juego antes de su propio aviso de conexión
  p.b.t.enviar(JSON.stringify({ c: 'm', d: { t: 'jugada', j: 'piedra' } }));
  p.entregar(); // el saludo basta para dar la conexión por hecha
  p.a._evento({ tipo: 'conectado', nombre: 'Beto' });
  p.entregar();
  comprobar(p.a.conectada(), 'A conectado');
  comprobar(p.oa.mensajes.length === 1 && p.oa.mensajes[0].j === 'piedra', 'se entrega el mensaje una sola vez');
})();

// 3. Juegos distintos o versiones distintas: error, sin conectar
(function () {
  var p = pareja('memoria', 'ahorcado');
  p.a.crear('Ana');
  p.b.buscar('Beto');
  p.a._evento({ tipo: 'conectado', nombre: 'Beto' });
  p.b._evento({ tipo: 'conectado', nombre: 'Ana' });
  p.entregar();
  comprobar(p.a.fase === 'error' && p.b.fase === 'error', 'juegos distintos no conectan');
  comprobar(!p.oa.conectado && !p.ob.conectado, 'el juego no se entera de nada');

  var q = pareja('memoria', 'memoria');
  q.a.crear('Ana');
  q.a._evento({ tipo: 'conectado', nombre: 'Beto' });
  q.a._evento({ tipo: 'mensaje', texto: JSON.stringify({ c: 'hola', v: Cerca.VERSION + 1, juego: 'memoria', nombre: 'Beto' }) });
  comprobar(q.a.fase === 'error' && /versión/.test(q.a.error), 'otra versión de la app no conecta');
})();

// 4. Permisos, errores y cancelar
(function () {
  var p = pareja('tresenraya', 'tresenraya');
  p.a.crear('Ana');
  p.a._evento({ tipo: 'permisos', ajustes: true });
  comprobar(p.a.fase === 'permisos' && p.a.permisosAjustes, 'pide permisos (y ofrece Ajustes)');
  p.a.volver();
  comprobar(p.a.fase === 'inicio', 'vuelve al inicio');
  p.a.buscar('Ana');
  p.a._evento({ tipo: 'error', texto: 'sin Bluetooth' });
  comprobar(p.a.fase === 'error' && p.a.error === 'sin Bluetooth', 'muestra el error');
  p.a._terminar('cancelado');
  comprobar(p.oa.cerrado === 'cancelado' && p.a.fase === 'cerrada', 'cancelar cierra la sala');
  p.a._evento({ tipo: 'conectado', nombre: 'X' });
  comprobar(p.a.fase === 'cerrada', 'una sala cerrada ignora eventos');
  // Mensajes basura no rompen nada
  var q = pareja('conecta4', 'conecta4');
  q.a._evento({ tipo: 'mensaje', texto: 'no es json' });
  q.a._evento({ tipo: 'mensaje', texto: 'null' });
  q.a._evento(null);
  comprobar(q.oa.mensajes.length === 0, 'ignora mensajes rotos');
  // Nombre: se recorta y tiene valor por defecto
  q.a.crear('   ');
  comprobar(q.a.nombre === 'Jugador', 'nombre por defecto');
  q.b.crear('Un nombre larguísimo de verdad');
  comprobar(q.b.nombre.length <= 14, 'nombre recortado');
})();

// 5. Sin la app de Android no está disponible
comprobar(Cerca.disponible() === false, 'en Node no hay Nearby');

if (fallos) {
  console.error(fallos + ' pruebas de cerca.js fallan');
  process.exit(1);
}
console.log('Pruebas de cerca.js OK');
