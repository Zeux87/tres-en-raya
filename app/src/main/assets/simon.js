// Lógica de Simón dice, sin DOM: la usan la pantalla y las pruebas en Node.
// Hay 4 colores (0 verde, 1 rojo, 2 amarillo, 3 azul). Cada ronda la secuencia crece en uno
// y hay que repetirla entera.
(function (raiz, crear) {
  var S = crear();
  if (typeof module === 'object' && module.exports) module.exports = S;
  else raiz.Simon = S;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var COLORES = 4;
  // Milisegundos que se enciende cada color al mostrar la secuencia, según el nivel
  var BASE = { lento: 700, normal: 520, rapido: 360 };

  function nuevo(azar) {
    var e = { secuencia: [], pos: 0 };
    crecer(e, azar);
    return e;
  }

  // Añade un color al final y vuelve a empezar a repetir desde el primero
  function crecer(e, azar) {
    azar = azar || Math.random;
    e.secuencia.push(Math.floor(azar() * COLORES));
    e.pos = 0;
  }

  // El jugador pulsa "color". Devuelve 'bien' (sigue), 'ronda' (secuencia completa) o 'mal'.
  function pulsar(e, color) {
    if (e.secuencia[e.pos] !== color) return 'mal';
    e.pos++;
    return e.pos >= e.secuencia.length ? 'ronda' : 'bien';
  }

  // Rondas superadas
  function puntos(e) { return e.secuencia.length - 1; }

  // Duración de cada destello: se acelera poco a poco con la longitud de la secuencia
  function duracion(nivel, largo) {
    var b = BASE[nivel] || BASE.normal;
    return Math.max(Math.round(b * 0.45), Math.round(b * Math.pow(0.97, Math.max(0, largo - 1))));
  }

  return { COLORES: COLORES, nuevo: nuevo, crecer: crecer, pulsar: pulsar, puntos: puntos, duracion: duracion };
});
