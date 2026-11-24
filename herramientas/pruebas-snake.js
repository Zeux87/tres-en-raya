// Pruebas de Snake. Ejecutar con: node herramientas/pruebas-snake.js
'use strict';
var path = require('path');
var S = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'snake.js'));

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

// Inicio
var e = S.nuevo(10, 10, semilla(1));
comprobar(e.cuerpo.length === 3 && e.vivo, 'empieza con 3 casillas');
comprobar(e.cuerpo.indexOf(e.comida) < 0, 'la comida no cae encima de la serpiente');

// Giros: no se puede dar media vuelta ni encolar más de 2
comprobar(!S.girar(e, 'izq'), 'no se da media vuelta');
comprobar(!S.girar(e, 'der'), 'misma dirección no cuenta');
comprobar(S.girar(e, 'arriba') && S.girar(e, 'izq'), 'dos giros seguidos');
comprobar(!S.girar(e, 'abajo'), 'como mucho 2 giros pendientes');

// Avanzar y comer (comida puesta a mano delante)
var a = S.nuevo(10, 10, semilla(2));
var cabeza = a.cuerpo[0];
a.comida = cabeza + 2;
comprobar(S.paso(a) === 'nada' && a.cuerpo[0] === cabeza + 1 && a.cuerpo.length === 3, 'avanza sin crecer');
comprobar(S.paso(a) === 'come' && a.cuerpo.length === 4 && a.puntos === 1, 'come y crece');
comprobar(a.cuerpo.indexOf(a.comida) < 0, 'nueva comida libre');

// Sin bordes: sale por la derecha y entra por la izquierda, y lo mismo arriba y abajo
var p = S.nuevo(10, 10, semilla(3));
p.comida = 99;
p.cuerpo = [59, 58, 57]; // fila 5, cabeza en la última columna mirando a la derecha
comprobar(S.paso(p) === 'nada' && p.vivo && p.cuerpo[0] === 50, 'sale por la derecha y entra por la izquierda');
p.cuerpo = [50, 51, 52]; p.dir = 'izq'; p.cola = [];
comprobar(S.paso(p) === 'nada' && p.cuerpo[0] === 59, 'sale por la izquierda y entra por la derecha');
p.cuerpo = [5, 15, 25]; p.dir = 'arriba'; p.cola = [];
comprobar(S.paso(p) === 'nada' && p.cuerpo[0] === 95, 'sale por arriba y entra por abajo');
p.cuerpo = [95, 85, 75]; p.dir = 'abajo'; p.cola = [];
comprobar(S.paso(p) === 'nada' && p.cuerpo[0] === 5, 'sale por abajo y entra por arriba');
// Dando vueltas en línea recta nunca muere
var v = S.nuevo(10, 10, semilla(3));
v.comida = 99;
for (var k = 0; k < 100; k++) S.paso(v);
comprobar(v.vivo, 'en línea recta da la vuelta al campo sin morir');
// Cruzar el borde hasta su propio cuerpo sí mata
var b = S.nuevo(10, 10, semilla(3));
b.comida = 99;
b.cuerpo = [9, 0, 1, 2, 3]; // la cabeza en la columna 9, el cuerpo al otro lado
b.dir = 'der';
// la siguiente casilla (0) la ocupa el cuerpo, que no es la cola
comprobar(S.paso(b) === 'muere', 'al cruzar el borde choca con su cuerpo');

// Chocar consigo misma: serpiente larga que gira en cuadrado
var m = S.nuevo(10, 10, semilla(4));
m.cuerpo = [44, 43, 42, 41, 40]; // fila 4, columnas 0-4, cabeza en 44 mirando a la derecha
m.comida = 99;
S.girar(m, 'abajo'); S.paso(m);   // 54
S.girar(m, 'izq'); S.paso(m);     // 53
S.girar(m, 'arriba');
comprobar(S.paso(m) === 'muere', 'choca consigo misma');

// Puede entrar en la casilla que deja la cola
var c = S.nuevo(10, 10, semilla(5));
c.cuerpo = [11, 1, 0, 10]; // cuadrado 2x2: cabeza 11, cola 10
c.dir = 'abajo';
c.comida = 99;
S.girar(c, 'izq');
comprobar(S.paso(c) === 'nada' && c.vivo, 'se puede perseguir la cola');

// Llenar el tablero entero = victoria
var g = S.nuevo(10, 10, semilla(6));
g.cols = 3; g.filas = 1; // tablero de 3x1 hecho a mano
g.cuerpo = [1, 0]; g.dir = 'der'; g.comida = 2; g.vivo = true;
comprobar(S.paso(g) === 'gana' && g.lleno, 'llenar el tablero gana');

// Velocidad
comprobar(S.velocidad('rapido', 0) < S.velocidad('normal', 0) && S.velocidad('normal', 0) < S.velocidad('lento', 0), 'niveles de velocidad');
comprobar(S.velocidad('normal', 500) === 85, 'la velocidad tiene un mínimo');

// Partidas al azar: siempre coherente
for (var s = 1; s <= 30; s++) {
  var az = semilla(s), j = S.nuevo(15, 17, az), pasos = 0;
  var dirs = ['arriba', 'abajo', 'izq', 'der'];
  while (j.vivo && pasos < 3000) {
    if (az() < 0.25) S.girar(j, dirs[Math.floor(az() * 4)]);
    S.paso(j, az);
    pasos++;
    var unicas = {};
    j.cuerpo.forEach(function (i) { unicas[i] = true; });
    if (Object.keys(unicas).length !== j.cuerpo.length) { comprobar(false, 'la serpiente se solapa'); break; }
  }
  comprobar(j.cuerpo.length === 3 + j.puntos, 'longitud = 3 + puntos');
  comprobar(S.valido(JSON.parse(JSON.stringify(j))), 'el estado se guarda en JSON');
}

if (fallos) {
  console.error(fallos + ' prueba(s) de Snake fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Snake OK');
