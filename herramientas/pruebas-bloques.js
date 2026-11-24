// Pruebas de la lógica de Bloques. Ejecutar con: node herramientas/pruebas-bloques.js
'use strict';
var path = require('path');
var B = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'bloques.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 1. Cada pieza tiene 4 celdas en sus 4 giros y la O no cambia al girar
for (var tipo = 1; tipo <= 7; tipo++) {
  comprobar(B.GIROS[tipo].length === 4 && B.GIROS[tipo].every(function (g) { return g.length === 4; }), 'pieza ' + tipo + ': 4 celdas');
}
comprobar(JSON.stringify(B.GIROS[2][0]) === JSON.stringify(B.GIROS[2][1]), 'la O no cambia al girar');

// 2. La bolsa da las 7 piezas en cada tanda de 7
var az = azarFijo(3);
var e = B.nuevo(1, az), vistas = [e.pieza.tipo, e.siguiente];
for (var i = 0; i < 5; i++) { B.caer(e, az); vistas.push(e.siguiente); }
comprobar(vistas.slice().sort().join('') === '1234567', 'bolsa de 7 piezas distintas: ' + vistas.join(''));

// 3. Mover contra las paredes
var e2 = B.nuevo(1, azarFijo(4));
var n = 0;
while (B.mover(e2, -1)) n++;
comprobar(n > 0 && n < 10 && !B.mover(e2, -1), 'se para en la pared izquierda');
comprobar(B.celdas(e2.pieza).some(function (c) { return c[0] === 0; }), 'toca la columna 0');

// 4. Caer: llega al fondo y suma puntos
var e3 = B.nuevo(1, azarFijo(5));
var y0 = e3.pieza.y, yf = B.fondo(e3);
B.caer(e3);
comprobar(e3.puntos === 2 * (yf - y0), 'caer suma 2 puntos por fila');
comprobar(e3.t.slice(B.COLS * (B.FILAS - 1)).some(Boolean), 'la pieza queda en la última fila');

// 5. Borrar una línea
var e4 = B.nuevo(1, azarFijo(6));
for (var x = 0; x < B.COLS - 4; x++) e4.t[(B.FILAS - 1) * B.COLS + x] = 3;
e4.pieza = { tipo: 1, rot: 0, x: B.COLS - 4, y: 0 }; // I tumbada que rellena las 4 últimas
var borradas = B.caer(e4);
comprobar(borradas.length === 1 && e4.lineas === 1, 'borra una línea');
comprobar(e4.t.slice(B.COLS * (B.FILAS - 1)).every(function (v) { return !v; }), 'la última fila queda vacía');
comprobar(e4.puntos >= 100, 'una línea da 100 puntos por nivel');

// 6. Cuatro líneas de golpe con una I vertical
var e5 = B.nuevo(1, azarFijo(7));
for (var y = B.FILAS - 4; y < B.FILAS; y++) for (var x2 = 0; x2 < B.COLS - 1; x2++) e5.t[y * B.COLS + x2] = 4;
e5.pieza = { tipo: 1, rot: 1, x: B.COLS - 3, y: 0 }; // giro 1 de la I: columna 2 de su caja
comprobar(B.celdas(e5.pieza).every(function (c) { return c[0] === B.COLS - 1; }), 'la I vertical va por la última columna');
var b5 = B.caer(e5);
comprobar(b5.length === 4 && e5.puntos >= 800, 'cuatro líneas valen 800');
comprobar(e5.t.every(function (v) { return !v; }), 'el tablero queda vacío');

// 7. Girar junto a la pared empuja la pieza
var e6 = B.nuevo(1, azarFijo(8));
e6.pieza = { tipo: 1, rot: 1, x: -2, y: 5 };
comprobar(B.cabe(e6.t, e6.pieza), 'I vertical pegada a la izquierda');
comprobar(B.rotar(e6, 1) && B.cabe(e6.t, e6.pieza), 'al girar contra la pared se desplaza');

// 8. Nivel y velocidad
var e7 = B.nuevo(1, azarFijo(9));
e7.lineas = 9;
for (var x3 = 0; x3 < B.COLS - 4; x3++) e7.t[(B.FILAS - 1) * B.COLS + x3] = 3;
e7.pieza = { tipo: 1, rot: 0, x: B.COLS - 4, y: 0 };
B.caer(e7);
comprobar(e7.nivel === 2, 'cada 10 líneas sube de nivel');
comprobar(B.velocidad(1) > B.velocidad(5) && B.velocidad(50) === 70, 'más rápido con el nivel, con límite');
comprobar(B.nuevo(5).nivel === 5, 'nivel inicial');

// 9. Se acaba al llenarse
var e8 = B.nuevo(1, azarFijo(10));
var guard = 0;
while (!e8.fin && guard++ < 500) B.caer(e8);
comprobar(e8.fin && guard < 500, 'la partida termina si se llena');
comprobar(B.bajar(e8) === null && B.mover(e8, 1) === false, 'tras el fin no se mueve');

comprobar(B.valido(B.nuevo()) && !B.valido(null) && !B.valido(e8), 'valido()');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Bloques OK');
