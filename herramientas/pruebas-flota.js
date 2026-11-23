// Pruebas de la lógica de Hundir la flota. Ejecutar con: node herramientas/pruebas-flota.js
'use strict';
var path = require('path');
var F = require(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'flota.js'));

var fallos = 0;
function comprobar(cond, msg) {
  if (!cond) { fallos++; console.error('FALLO: ' + msg); }
}

// Generador pseudoaleatorio con semilla, para que las pruebas sean repetibles
function semilla(s) {
  return function () {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// celdasDe
comprobar(JSON.stringify(F.celdasDe(0, 3, true)) === '[0,1,2]', 'horizontal desde A1');
comprobar(JSON.stringify(F.celdasDe(0, 3, false)) === '[0,10,20]', 'vertical desde A1');
comprobar(F.celdasDe(8, 3, true) === null, 'se sale por la derecha');
comprobar(F.celdasDe(80, 3, false) === null, 'se sale por abajo');
comprobar(F.nombreCasilla(0) === 'A1' && F.nombreCasilla(99) === 'J10', 'nombres de casilla');

// vecinas
comprobar(F.vecinas(0).length === 3, 'esquina con 3 vecinas');
comprobar(F.vecinas(55).length === 8, 'centro con 8 vecinas');

// sePuedeColocar: no pisar ni tocar
var b = [F.barcoNuevo(F.FLOTA[4], [0, 1], true)];
comprobar(!F.sePuedeColocar(b, [1, 2]), 'no puede pisar');
comprobar(!F.sePuedeColocar(b, [2, 3]), 'no puede tocar de lado');
comprobar(!F.sePuedeColocar(b, [12, 13]), 'no puede tocar en diagonal');
comprobar(F.sePuedeColocar(b, [3, 4]), 'separado una casilla sí');
comprobar(F.sePuedeColocar(b, [1, 2], 'destructor'), 'se ignora el propio barco al moverlo');

// Flotas aleatorias válidas
for (var n = 0; n < 500; n++) {
  var flota = F.flotaAleatoria(semilla(n + 1));
  comprobar(flota.length === F.FLOTA.length, 'flota completa');
  var total = 0;
  for (var i = 0; i < flota.length; i++) {
    total += flota[i].celdas.length;
    comprobar(flota[i].celdas.length === flota[i].largo, 'largo correcto');
    comprobar(F.sePuedeColocar(flota, flota[i].celdas, flota[i].id), 'barcos sin tocarse');
  }
  comprobar(total === 17, 'ocupa 17 casillas');
}

// Partida completa: disparar a todo hasta hundir la flota
var j = F.nuevoJugador('Prueba');
j.barcos = F.flotaAleatoria(semilla(42));
var tocados = 0, hundidos = 0, fin = false, disparos = 0;
for (var c = 0; c < F.TOTAL && !fin; c++) {
  var r = F.disparar(j, c);
  if (r.tipo === 'repetido') {
    comprobar(j.disparos[c] === 'agua', 'repetido solo en agua automática');
    continue;
  }
  disparos++;
  if (r.tipo === 'tocado' || r.tipo === 'hundido') tocados++;
  if (r.tipo === 'hundido') {
    hundidos++;
    r.aguaAuto.forEach(function (a) { comprobar(!F.barcoEn(j, a), 'agua automática no cae en barco'); });
  }
  fin = r.fin;
}
comprobar(fin, 'la partida termina');
comprobar(tocados === 17, 'se tocan 17 casillas (' + tocados + ')');
comprobar(hundidos === 5, 'se hunden 5 barcos');
comprobar(F.derrotado(j), 'jugador derrotado');
comprobar(F.quedan(j) === 0, 'no quedan barcos');
comprobar(F.disparar(j, 0).tipo === 'repetido', 'disparo repetido detectado');

// Un jugador sin barcos no cuenta como derrotado
comprobar(!F.derrotado(F.nuevoJugador('vacío')), 'sin flota no está derrotado');

if (fallos) {
  console.error(fallos + ' prueba(s) de la flota fallida(s)');
  process.exit(1);
}
console.log('Pruebas de la flota OK (' + disparos + ' disparos en la partida de prueba)');
