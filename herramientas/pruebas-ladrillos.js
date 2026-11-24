// Pruebas de la lógica de Rompeladrillos. Ejecutar con: node herramientas/pruebas-ladrillos.js
'use strict';
var path = require('path');
var L = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'ladrillos.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}
function azarFijo(semilla) {
  var s = semilla;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// 1. Nuevo: 40 ladrillos, 3 vidas y la bola pegada a la pala
var e = L.nuevo();
comprobar(L.quedan(e) === 40 && e.vidas === 3 && e.bola.pegada, 'partida nueva');
comprobar(L.NIVELES.every(function (n) { return n.every(function (f) { return f.length === L.COLS; }); }), 'niveles de 8 columnas');
comprobar(L.avanzar(e, 1).length === 0 && e.bola.pegada, 'pegada no se mueve');

// 2. La pala no se sale y arrastra la bola pegada
L.moverPala(e, -100);
comprobar(e.pala === L.anchoPala(1) / 2 && e.bola.x === e.pala, 'pala en el borde izquierdo con la bola');
L.moverPala(e, 1000);
comprobar(e.pala === L.ANCHO - L.anchoPala(1) / 2, 'pala en el borde derecho');

// 3. Lanzar: sube con la rapidez del nivel
L.moverPala(e, 150);
comprobar(L.lanzar(e, azarFijo(1)) && !e.bola.pegada && e.bola.vy < 0, 'lanzada hacia arriba');
var v = Math.sqrt(e.bola.vx * e.bola.vx + e.bola.vy * e.bola.vy);
comprobar(Math.abs(v - L.rapidez(1)) < 1e-9, 'rapidez del nivel 1');
comprobar(!L.lanzar(e), 'no se lanza dos veces');

// 4. Golpea ladrillos y suma puntos
var s = [], guard = 0;
while (s.indexOf('roto') < 0 && guard++ < 500) s = s.concat(L.avanzar(e, 1));
comprobar(s.indexOf('roto') >= 0 && L.quedan(e) === 39 && e.puntos === 10, 'rompe un ladrillo: 10 puntos');
comprobar(e.bola.vy > 0, 'tras romperlo, baja');

// 5. Rebote en la pala: en el centro sale casi recta, en el borde inclinada
function rebote(desplaza) {
  var x = L.nuevo();
  x.ladrillos = x.ladrillos.map(function () { return 0; });
  x.ladrillos[0] = 1; // para no pasar de nivel
  x.bola = { x: 150 + desplaza, y: L.PALA_Y - 30, vx: 0, vy: 4, pegada: false };
  x.pala = 150;
  var su = [], g = 0;
  while (su.indexOf('pala') < 0 && g++ < 100) su = su.concat(L.avanzar(x, 1));
  return x.bola;
}
var centro = rebote(0), borde = rebote(L.anchoPala(1) / 2 - 2);
comprobar(centro.vy < 0 && Math.abs(centro.vx) < 0.01, 'en el centro sale recta');
comprobar(borde.vy < 0 && borde.vx > 2, 'en el borde derecho sale hacia la derecha');

// 6. Perder la bola quita una vida y la vuelve a pegar; con 0 vidas, fin
var f = L.nuevo();
f.bola = { x: 20, y: L.ALTO - 10, vx: 0, vy: 5, pegada: false };
f.pala = 250;
var sf = [], gf = 0;
while (!sf.length && gf++ < 50) sf = L.avanzar(f, 1).filter(function (x) { return x === 'vida' || x === 'fin'; });
comprobar(sf[0] === 'vida' && f.vidas === 2 && f.bola.pegada, 'pierde una vida');
f.vidas = 1;
f.bola = { x: 20, y: L.ALTO - 10, vx: 0, vy: 5, pegada: false };
sf = []; gf = 0;
while (!sf.length && gf++ < 50) sf = L.avanzar(f, 1).filter(function (x) { return x === 'vida' || x === 'fin'; });
comprobar(sf[0] === 'fin' && f.vidas === 0 && !L.valido(f), 'sin vidas, fin');

// 7. Romper el último ladrillo pasa de nivel
var n = L.nuevo();
n.ladrillos = n.ladrillos.map(function () { return 0; });
n.ladrillos[3] = 1;
var r = L.rectLadrillo(3);
n.bola = { x: r.x + r.w / 2, y: r.y + r.h + 20, vx: 0, vy: -4, pegada: false };
var sn = [], gn = 0;
while (sn.indexOf('nivel') < 0 && gn++ < 50) sn = sn.concat(L.avanzar(n, 1));
comprobar(n.nivel === 2 && n.bola.pegada && L.quedan(n) > 0 && n.puntos === 110, 'pasa al nivel 2 con 100 puntos de premio');
comprobar(L.anchoPala(2) < L.anchoPala(1) && L.rapidez(2) > L.rapidez(1), 'el nivel 2 es más difícil');

// 8. Los ladrillos duros aguantan dos golpes
var d = L.nuevo();
d.ladrillos = d.ladrillos.map(function () { return 0; });
d.ladrillos[0] = 2; d.ladrillos[7] = 1;
var rd = L.rectLadrillo(0);
d.bola = { x: rd.x + rd.w / 2, y: rd.y + rd.h + 10, vx: 0, vy: -4, pegada: false };
var sd = [], gd = 0;
while (sd.indexOf('ladrillo') < 0 && gd++ < 50) sd = sd.concat(L.avanzar(d, 1));
comprobar(d.ladrillos[0] === 1 && d.puntos === 5, 'el ladrillo duro queda tocado');

// 9. Una partida larga sin pala nunca se queda atascada ni sale del campo
var p = L.nuevo(), az = azarFijo(9), pasos = 0, dentro = true;
L.lanzar(p, az);
while (p.vidas > 0 && pasos < 20000) {
  // La pala sigue a la bola: así se juega mucho rato
  L.moverPala(p, p.bola.x + (az() - 0.5) * 20);
  L.avanzar(p, 1);
  if (p.bola.pegada) L.lanzar(p, az);
  if (p.bola.x < 0 || p.bola.x > L.ANCHO || p.bola.y < 0) dentro = false;
  pasos++;
}
comprobar(dentro, 'la bola no sale por los lados ni por arriba');
comprobar(p.nivel > 1 || L.quedan(p) < 40, 'la partida avanza (nivel ' + p.nivel + ', quedan ' + L.quedan(p) + ')');

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Rompeladrillos OK');
