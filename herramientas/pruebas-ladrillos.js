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
var nunca = function () { return 0.99; }; // nunca suelta cápsulas
function bola(x, y, vx, vy) { return { x: x, y: y, vx: vx, vy: vy, pegada: false, dx: 0 }; }
// Partida con un solo ladrillo (para no pasar de nivel sin querer)
function casiVacia(i) {
  var x = L.nuevo();
  x.ladrillos = x.ladrillos.map(function () { return 0; });
  x.ladrillos[i === undefined ? 0 : i] = 1;
  return x;
}
function hasta(e, suceso, max, azar) {
  var s = [], g = 0;
  while (!s.some(function (x) { return x.indexOf(suceso) === 0; }) && g++ < (max || 200)) s = s.concat(L.avanzar(e, 1, azar || nunca));
  return s;
}

// 1. Nuevo: 40 ladrillos, 3 vidas y una bola pegada a la pala
var e = L.nuevo();
comprobar(L.quedan(e) === 40 && e.vidas === 3 && e.bolas.length === 1 && e.bolas[0].pegada, 'partida nueva');
comprobar(L.NIVELES.every(function (n) { return n.every(function (f) { return f.length === L.COLS; }); }), 'niveles de 8 columnas');
comprobar(L.avanzar(e, 1).length === 0 && e.bolas[0].pegada, 'pegada no se mueve');

// 2. La pala no se sale y arrastra la bola pegada
L.moverPala(e, -100);
comprobar(e.pala === L.anchoPala(e) / 2 && e.bolas[0].x === e.pala, 'pala en el borde izquierdo con la bola');
L.moverPala(e, 1000);
comprobar(e.pala === L.ANCHO - L.anchoPala(e) / 2, 'pala en el borde derecho');

// 3. Lanzar: sube con la rapidez del nivel
L.moverPala(e, 150);
comprobar(L.lanzar(e, azarFijo(1)) && !e.bolas[0].pegada && e.bolas[0].vy < 0, 'lanzada hacia arriba');
var v = Math.sqrt(e.bolas[0].vx * e.bolas[0].vx + e.bolas[0].vy * e.bolas[0].vy);
comprobar(Math.abs(v - L.rapidez(1)) < 1e-9, 'rapidez del nivel 1');
comprobar(!L.lanzar(e), 'no se lanza dos veces');

// 4. Golpea ladrillos y suma puntos
hasta(e, 'roto', 500);
comprobar(L.quedan(e) === 39 && e.puntos === 10, 'rompe un ladrillo: 10 puntos');
comprobar(e.bolas[0].vy > 0, 'tras romperlo, baja');

// 5. Rebote en la pala: en el centro sale casi recta, en el borde inclinada
function rebote(desplaza) {
  var x = casiVacia();
  x.bolas = [bola(150 + desplaza, L.PALA_Y - 30, 0, 4)];
  x.pala = 150;
  hasta(x, 'pala', 100);
  return x.bolas[0];
}
var centro = rebote(0), borde = rebote(L.anchoPala(1) / 2 - 2);
comprobar(centro.vy < 0 && Math.abs(centro.vx) < 0.01, 'en el centro sale recta');
comprobar(borde.vy < 0 && borde.vx > 2, 'en el borde derecho sale hacia la derecha');

// 6. Perder la bola quita una vida y la vuelve a pegar; con 0 vidas, fin
var f = L.nuevo();
f.bolas = [bola(20, L.ALTO - 10, 0, 5)];
f.pala = 250;
var sf = hasta(f, 'vida', 50);
comprobar(sf.indexOf('vida') >= 0 && f.vidas === 2 && f.bolas.length === 1 && f.bolas[0].pegada, 'pierde una vida');
f.vidas = 1;
f.bolas = [bola(20, L.ALTO - 10, 0, 5)];
sf = hasta(f, 'fin', 50);
comprobar(sf.indexOf('fin') >= 0 && f.vidas === 0 && !L.valido(f), 'sin vidas, fin');

// 7. Romper el último ladrillo pasa de nivel
var n = casiVacia(3);
var r = L.rectLadrillo(3);
n.bolas = [bola(r.x + r.w / 2, r.y + r.h + 20, 0, -4)];
hasta(n, 'nivel', 50);
comprobar(n.nivel === 2 && n.bolas[0].pegada && L.quedan(n) > 0 && n.puntos === 110, 'pasa al nivel 2 con 100 puntos de premio');
comprobar(L.anchoPala(2) < L.anchoPala(1) && L.rapidez(2) > L.rapidez(1), 'el nivel 2 es más difícil');

// 8. Los ladrillos duros aguantan dos golpes
var d = L.nuevo();
d.ladrillos = d.ladrillos.map(function () { return 0; });
d.ladrillos[0] = 2; d.ladrillos[7] = 1;
var rd = L.rectLadrillo(0);
d.bolas = [bola(rd.x + rd.w / 2, rd.y + rd.h + 10, 0, -4)];
hasta(d, 'ladrillo', 50);
comprobar(d.ladrillos[0] === 1 && d.puntos === 5, 'el ladrillo duro queda tocado');

// ---------- Poderes ----------

// 9. Romper un ladrillo puede soltar una cápsula, que cae
var c = L.nuevo();
var rc = L.rectLadrillo(2);
c.bolas = [bola(rc.x + rc.w / 2, rc.y + rc.h + 10, 0, -4)];
hasta(c, 'roto', 50, function () { return 0.01; }); // siempre suelta
comprobar(c.capsulas.length === 1 && L.PODERES.indexOf(c.capsulas[0].tipo) >= 0, 'suelta una cápsula');
var y0 = c.capsulas[0].y;
L.avanzar(c, 1, nunca);
comprobar(c.capsulas.length && c.capsulas[0].y > y0, 'la cápsula cae');

// 10. Cogerla con la pala activa el poder; si cae fuera, se pierde
function coger(tipo, preparar) {
  var x = casiVacia(7);
  x.bolas = [bola(30, 100, 2, -3)];
  x.pala = 150;
  if (preparar) preparar(x);
  x.capsulas = [{ x: 150, y: L.PALA_Y - 20, tipo: tipo }];
  var s = hasta(x, 'capsula:', 40);
  return { e: x, s: s };
}
var larga = coger('larga');
comprobar(larga.s.indexOf('capsula:larga') >= 0 && larga.e.efectos.larga > 0, 'coge la cápsula de pala larga');
comprobar(L.anchoPala(larga.e) > L.anchoPala(1) * 1.4, 'la pala es más larga');
var perdida = casiVacia(7);
perdida.bolas = [bola(30, 100, 2, -3)];
perdida.pala = 40;
perdida.capsulas = [{ x: 250, y: L.PALA_Y - 20, tipo: 'vida' }];
for (var k = 0; k < 60; k++) L.avanzar(perdida, 1, nunca);
comprobar(perdida.capsulas.length === 0 && perdida.vidas === 3, 'la cápsula que cae fuera se pierde');

// 11. Los poderes se acaban con el tiempo
var t = coger('larga').e;
for (var p = 0; p < L.DURACION.larga + 5; p++) {
  t.bolas = [bola(150, 200, 0, -3)]; // mantiene una bola en juego lejos de todo
  L.avanzar(t, 1, nunca);
}
comprobar(!t.efectos.larga && L.anchoPala(t) === L.anchoPala(1), 'la pala larga se acaba');

// 12. Multibola: tres bolas; se pierde la vida solo cuando caen todas
var mb = coger('multi').e;
comprobar(mb.bolas.length === 3, 'multibola: 3 bolas (' + mb.bolas.length + ')');
comprobar(mb.bolas.every(function (b) { return Math.abs(Math.sqrt(b.vx * b.vx + b.vy * b.vy) - L.rapidez(1)) < 0.6; }), 'las bolas nuevas van a la misma rapidez');
mb.bolas[0] = bola(20, L.ALTO + 20, 0, 5); // una se escapa
mb.bolas[1].y = 100; mb.bolas[2].y = 120;
L.avanzar(mb, 1, nunca);
comprobar(mb.bolas.length === 2 && mb.vidas === 3, 'si cae una de varias, no se pierde vida');
var muchas = casiVacia(7);
muchas.bolas = [bola(150, 200, 1, -3)];
for (var q = 0; q < 10; q++) L.activar(muchas, 'multi');
comprobar(muchas.bolas.length === L.MAX_BOLAS, 'como mucho ' + L.MAX_BOLAS + ' bolas');

// 13. Bola lenta: más despacio y vuelve a la rapidez normal al acabar
var ln = coger('lenta').e;
var vl = Math.sqrt(ln.bolas[0].vx * ln.bolas[0].vx + ln.bolas[0].vy * ln.bolas[0].vy);
comprobar(Math.abs(vl - L.rapidez(1) * L.LENTA) < 0.3, 'la bola va más lenta');
for (var w = 0; w < L.DURACION.lenta + 5; w++) {
  ln.bolas[0].y = Math.max(ln.bolas[0].y, 150); ln.bolas[0].y = Math.min(ln.bolas[0].y, 300);
  L.avanzar(ln, 1, nunca);
}
var vn = Math.sqrt(ln.bolas[0].vx * ln.bolas[0].vx + ln.bolas[0].vy * ln.bolas[0].vy);
comprobar(!ln.efectos.lenta && Math.abs(vn - L.rapidez(1)) < 0.3, 'al acabar, vuelve a su rapidez');

// 14. Pegajosa: la bola se queda en la pala y sale al lanzar, hacia el lado donde tocó
var pg = coger('pegajosa').e;
pg.bolas = [bola(160, L.PALA_Y - 30, 0, 4)];
hasta(pg, 'pala', 40);
comprobar(pg.bolas[0].pegada && pg.bolas[0].dx > 0, 'se queda pegada a la derecha del centro');
L.moverPala(pg, 100);
comprobar(Math.abs(pg.bolas[0].x - (100 + pg.bolas[0].dx)) < 1e-9, 'se mueve con la pala');
comprobar(L.lanzar(pg) && pg.bolas[0].vy < 0 && pg.bolas[0].vx > 0, 'sale hacia la derecha');

// 15. Vida extra, con un máximo
var vi = coger('vida').e;
comprobar(vi.vidas === 4, 'vida extra');
vi.vidas = L.MAX_VIDAS;
L.activar(vi, 'vida');
comprobar(vi.vidas === L.MAX_VIDAS, 'como mucho ' + L.MAX_VIDAS + ' vidas');

// 16. Láser: dispara solo y los disparos rompen ladrillos
var lz = coger('laser').e;
lz.ladrillos = lz.ladrillos.map(function () { return 0; });
lz.ladrillos[3] = 1; lz.ladrillos[4] = 1; lz.ladrillos[39] = 1;
lz.pala = (L.rectLadrillo(3).x + L.rectLadrillo(4).x + L.rectLadrillo(4).w) / 2;
var sl = [];
for (var z = 0; z < 120; z++) {
  lz.bolas = [bola(5, 300, 0, -1.5)];
  sl = sl.concat(L.avanzar(lz, 1, nunca));
}
comprobar(sl.indexOf('disparo') >= 0, 'el láser dispara');
comprobar(lz.ladrillos[3] === 0 && lz.ladrillos[4] === 0, 'los disparos rompen los ladrillos de encima');
comprobar(lz.puntos >= 20, 'los ladrillos rotos con el láser dan puntos');

// 17. Al perder una vida se acaban los poderes
var pv = coger('laser').e;
pv.bolas = [bola(20, L.ALTO + 20, 0, 5)];
pv.pala = 250;
hasta(pv, 'vida', 10);
comprobar(Object.keys(pv.efectos).length === 0 && pv.capsulas.length === 0 && pv.disparos.length === 0, 'perder la bola quita los poderes');

// 17b. Aparcar (guardar a medias) deja una bola en la pala pero conserva los poderes
var ap = coger('larga').e;
ap.capsulas = [{ x: 10, y: 10, tipo: 'vida' }];
L.aparcar(ap);
comprobar(ap.bolas.length === 1 && ap.bolas[0].pegada && !ap.capsulas.length && ap.efectos.larga > 0, 'aparcar conserva los poderes');

// 18. Las partidas guardadas antes de los poderes se pueden seguir
var vieja = { nivel: 2, vidas: 2, puntos: 300, pala: 150, ladrillos: [1, 1, 0], filas: 1, bola: bola(150, 380, 0, 0) };
var arreglada = L.arreglar(JSON.parse(JSON.stringify(vieja)));
comprobar(L.valido(arreglada) && arreglada.bolas.length === 1 && !arreglada.bola, 'partida vieja recuperada');

// 19. Una partida larga con poderes nunca se queda atascada ni sale del campo
var j = L.nuevo(), az = azarFijo(9), pasos = 0, dentro = true, cogidas = {};
L.lanzar(j, az);
while (j.vidas > 0 && pasos < 30000) {
  // La pala sigue a la bola más baja
  var baja = j.bolas.reduce(function (m, b) { return b.y > m.y ? b : m; }, j.bolas[0]);
  L.moverPala(j, baja.x + (az() - 0.5) * 20);
  L.avanzar(j, 1, az).forEach(function (s) { if (s.indexOf('capsula:') === 0) cogidas[s.slice(8)] = true; });
  if (j.bolas.every(function (b) { return b.pegada; })) L.lanzar(j, az);
  j.bolas.forEach(function (b) { if (b.x < 0 || b.x > L.ANCHO || b.y < 0) dentro = false; });
  if (!L.valido(j) && j.vidas > 0) { dentro = false; break; }
  pasos++;
}
comprobar(dentro, 'las bolas no salen por los lados ni por arriba');
comprobar(j.nivel > 1, 'la partida avanza (nivel ' + j.nivel + ')');
comprobar(Object.keys(cogidas).length >= 4, 'se cogen varios poderes distintos: ' + Object.keys(cogidas).join(', '));

if (fallos) {
  console.error(fallos + ' prueba(s) fallida(s)');
  process.exit(1);
}
console.log('Pruebas de Rompeladrillos OK');
