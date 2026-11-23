// Pruebas de la plantilla común (plataforma.js) sin navegador.
// Ejecutar con: node herramientas/pruebas-plataforma.js
'use strict';
var path = require('path');

// localStorage de mentira
var datos = {};
globalThis.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(datos, k) ? datos[k] : null; },
  setItem: function (k, v) { datos[k] = String(v); },
  removeItem: function (k) { delete datos[k]; }
};

var P = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'plataforma.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

// almacen: claves con prefijo, valores por defecto y datos rotos
var a = P.almacen('prueba');
comprobar(a.leer('nada', 7) === 7, 'valor por defecto si no existe');
a.escribir('v1', { x: 1 });
comprobar(datos['prueba.v1'] === '{"x":1}', 'escribe con prefijo y en JSON');
comprobar(a.leer('v1', null).x === 1, 'lee lo escrito');
datos['prueba.roto'] = '{no es json';
comprobar(a.leer('roto', 'def') === 'def', 'JSON roto devuelve el valor por defecto');
a.borrar('v1');
comprobar(!('prueba.v1' in datos), 'borra');

// Compatibilidad: las claves de antes siguen siendo las mismas
datos['flota.partida'] = '{"fase":"disparar"}';
comprobar(P.partida('flota').cargar().fase === 'disparar', 'lee la partida de la flota guardada antes de la plantilla');
datos['tresenraya.v1'] = '{"modo":"dos"}';
comprobar(P.almacen('tresenraya').leer('v1', null).modo === 'dos', 'lee los ajustes del 3 en raya guardados antes');

// partida y marca de "partida a medias"
var p = P.partida('juego');
comprobar(p.cargar() === null && !P.enCurso('juego'), 'sin partida al principio');
p.guardar({ turno: 'X' });
comprobar(p.cargar().turno === 'X' && P.enCurso('juego'), 'guardar marca la partida en curso');
p.guardar({ fase: 'fin' }, false);
comprobar(p.cargar().fase === 'fin' && !P.enCurso('juego'), 'guardar(estado, false) no la marca en curso');
p.guardar({ turno: 'O' });
p.borrar();
comprobar(p.cargar() === null && !P.enCurso('juego'), 'borrar quita partida y marca');

// Sin almacenamiento (p. ej. bloqueado): no lanza
var real = globalThis.localStorage;
globalThis.localStorage = { getItem: function () { throw new Error('x'); }, setItem: function () { throw new Error('x'); }, removeItem: function () { throw new Error('x'); } };
try {
  p.guardar({ a: 1 });
  comprobar(p.cargar() === null, 'sin almacenamiento, cargar devuelve null');
  p.borrar();
} catch (e) {
  comprobar(false, 'sin almacenamiento no debe lanzar: ' + e.message);
}
globalThis.localStorage = real;

// ajustes y marcadores
var d = P.ajustes({ modo: 'raro', dificultad: 'x' }, ['facil', 'normal'], 'normal');
comprobar(d.modo === 'movil' && d.dificultad === 'normal' && typeof d.marcadores === 'object', 'ajustes corrige valores malos');
comprobar(P.ajustes(null, ['a'], 'a').modo === 'movil', 'ajustes con null');
var ms = {};
var m = P.marcadorDe(ms, 'dos', ['X', 'O', 'E']);
m.X++;
comprobar(ms.dos.X === 1 && ms.dos.O === 0 && ms.dos.E === 0, 'marcadorDe crea y devuelve el mismo objeto');
ms.viejo = { X: 3 };
comprobar(P.marcadorDe(ms, 'viejo', ['X', 'O']).X === 3 && ms.viejo.O === 0, 'marcadorDe respeta lo que había y completa');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de la plataforma OK');
