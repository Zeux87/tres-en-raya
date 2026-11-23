// Pruebas de la lógica del Ahorcado. Ejecutar con: node herramientas/pruebas-ahorcado.js
'use strict';
var path = require('path');
var A = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'ahorcado.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function semilla(s) {
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// Teclado español: 27 letras con la Ñ entre la N y la O
comprobar(A.LETRAS.length === 27 && A.LETRAS[14] === 'Ñ', 'teclado de 27 letras con Ñ');

// Normalizar
comprobar(A.normalizar('a') === 'A' && A.normalizar('Á') === 'A' && A.normalizar('é') === 'E', 'vocales con tilde');
comprobar(A.normalizar('ü') === 'U' && A.normalizar('ñ') === 'Ñ' && A.normalizar('Ñ') === 'Ñ', 'ü y ñ');
comprobar(A.normalizar('1') === null && A.normalizar(' ') === null && A.normalizar('ab') === null &&
  A.normalizar('ç') === null && A.normalizar(null) === null, 'caracteres no válidos');

// Lista de palabras: todas válidas, sin repetir y en mayúsculas
var vistas = {};
var todas = A.todasLasPalabras();
todas.forEach(function (x) {
  var r = A.limpiarPalabra(x.palabra);
  comprobar(r.palabra === x.palabra, 'palabra válida: ' + x.palabra + ' ' + (r.error || ''));
  comprobar(!vistas[x.palabra], 'palabra repetida: ' + x.palabra);
  vistas[x.palabra] = true;
});
Object.keys(A.CATEGORIAS).forEach(function (k) {
  comprobar(A.CATEGORIAS[k].palabras.length >= 20, k + ': al menos 20 palabras');
});
comprobar(todas.some(function (x) { return x.palabra.indexOf('Ñ') >= 0; }), 'hay palabras con Ñ');

// Limpiar palabras escritas a mano
comprobar(A.limpiarPalabra('  cigüeña ').palabra === 'CIGÜEÑA', 'limpia espacios y pasa a mayúsculas');
comprobar(!!A.limpiarPalabra('').error, 'vacía');
comprobar(!!A.limpiarPalabra('dos palabras').error, 'con espacios');
comprobar(!!A.limpiarPalabra('hola1').error, 'con números');
comprobar(!!A.limpiarPalabra('ab').error, 'demasiado corta');
comprobar(!!A.limpiarPalabra('abcdefghijklmno').error, 'demasiado larga');
comprobar(A.limpiarPalabra('sol').palabra === 'SOL', 'tres letras vale');

// Elegir palabras
var azar = semilla(3);
for (var i = 0; i < 100; i++) {
  var e1 = A.elegir('animales', azar);
  comprobar(A.CATEGORIAS.animales.palabras.indexOf(e1.palabra) >= 0 && e1.categoria === 'animales', 'elige de la categoría');
  var e2 = A.elegir('todas', azar);
  comprobar(!!vistas[e2.palabra] && !!A.CATEGORIAS[e2.categoria], 'elige de todas');
}
var casi = A.CATEGORIAS.comida.palabras.slice(1);
comprobar(A.elegir('comida', azar, casi).palabra === A.CATEGORIAS.comida.palabras[0], 'evita las recientes');
var llenas = A.CATEGORIAS.comida.palabras.slice();
comprobar(!!A.elegir('comida', azar, llenas).palabra, 'si todas son recientes, elige igual');

// Partida: aciertos con tildes, repetidas, fallos y máscara
var p = A.nueva('PINGÜINO');
comprobar(A.mascara(p).join(',') === ',,,,,,,', 'al empezar no se ve nada');
comprobar(A.probar(p, 'u') === 'acierto', 'la U descubre la Ü');
comprobar(A.mascara(p)[4] === 'Ü', 'la máscara muestra la letra original con diéresis');
comprobar(A.probar(p, 'ú') === 'repetida', 'Ú es la misma letra que U');
comprobar(A.probar(p, 'z') === 'fallo' && p.fallos === 1, 'fallo');
comprobar(A.probar(p, 'Z') === 'repetida' && p.fallos === 1, 'repetir un fallo no cuenta');
comprobar(A.probar(p, '3') === 'invalida', 'letra no válida');
['p', 'i', 'n', 'g'].forEach(function (l) { A.probar(p, l); });
comprobar(A.probar(p, 'o') === 'acierto' && A.resultado(p) === 'gana', 'gana al descubrir todo');
comprobar(A.probar(p, 'x') === 'terminada', 'no se juega tras terminar');

var ñ = A.nueva('ESPAÑA');
comprobar(A.probar(ñ, 'n') === 'fallo', 'la N no descubre la Ñ');
comprobar(A.probar(ñ, 'ñ') === 'acierto' && A.mascara(ñ)[4] === 'Ñ', 'la Ñ se descubre');

var acento = A.nueva('CAMIÓN');
A.probar(acento, 'o');
comprobar(A.mascara(acento)[4] === 'Ó', 'la O descubre la Ó');

// Perder con 6 fallos
var q = A.nueva('SOL');
'ABCDE'.split('').forEach(function (l) { A.probar(q, l); });
comprobar(q.fallos === 5 && A.resultado(q) === null, 'con 5 fallos sigue');
comprobar(A.probar(q, 'F') === 'fallo' && A.resultado(q) === 'pierde', 'con 6 fallos pierde');
comprobar(A.probar(q, 'S') === 'terminada', 'tras perder no se juega');

// Todas las palabras se pueden ganar probando el teclado en orden y nunca se pasa de 6 fallos
todas.forEach(function (x) {
  var e = A.nueva(x.palabra);
  for (var k = 0; k < A.LETRAS.length && !A.resultado(e); k++) A.probar(e, A.LETRAS[k]);
  comprobar(A.resultado(e) !== null && e.fallos <= A.MAX_FALLOS, 'la partida termina: ' + x.palabra);
  var g = A.nueva(x.palabra);
  x.palabra.split('').forEach(function (l) { A.probar(g, l); });
  comprobar(A.resultado(g) === 'gana' && g.fallos === 0, 'se gana sin fallos: ' + x.palabra);
});

if (fallos) {
  console.error(fallos + ' prueba(s) del Ahorcado fallida(s)');
  process.exit(1);
}
console.log('Pruebas del Ahorcado OK (' + todas.length + ' palabras)');
