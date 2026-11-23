// Lógica de Piedra, papel o tijera: quién gana y cómo elige el móvil.
// Jugadas: 'piedra', 'papel', 'tijera'.
// Nivel 'facil': el móvil elige al azar.
// Nivel 'listo': el móvil aprende tus costumbres (qué sueles sacar después de
// tus últimas jugadas) y saca lo que le gana a lo que cree que vas a sacar.
(function (raiz) {
  'use strict';

  var JUGADAS = ['piedra', 'papel', 'tijera'];
  // Qué le gana a cada jugada
  var LE_GANA = { piedra: 'papel', papel: 'tijera', tijera: 'piedra' };
  var MAX_HISTORIAL = 60;

  function valida(j) { return JUGADAS.indexOf(j) >= 0; }

  // 'gana' si a le gana a b, 'pierde' si pierde, 'empate' si son iguales
  function resultado(a, b) {
    if (a === b) return 'empate';
    return LE_GANA[b] === a ? 'gana' : 'pierde';
  }

  function alAzar(azar) { return JUGADAS[Math.floor(azar() * 3) % 3]; }

  // Cuenta qué jugada vino después de cada aparición de "patron" (las últimas n jugadas)
  function contarTras(historial, n) {
    var cuenta = { piedra: 0, papel: 0, tijera: 0 }, total = 0;
    if (historial.length <= n) return { cuenta: cuenta, total: 0 };
    var patron = historial.slice(historial.length - n).join(',');
    for (var i = n; i < historial.length; i++) {
      if (n === 0 || historial.slice(i - n, i).join(',') === patron) {
        cuenta[historial[i]]++;
        total++;
      }
    }
    return { cuenta: cuenta, total: total };
  }

  // Qué cree el móvil que vas a sacar ahora, o null si aún no lo sabe
  function prediccion(historial) {
    // Se prueba primero con el patrón más largo que tenga datos suficientes
    for (var n = 3; n >= 0; n--) {
      var c = contarTras(historial, n);
      if (c.total < (n === 0 ? 3 : 2)) continue;
      var mejor = null, max = -1, empatadas = 0;
      JUGADAS.forEach(function (j) {
        if (c.cuenta[j] > max) { max = c.cuenta[j]; mejor = j; empatadas = 1; }
        else if (c.cuenta[j] === max) empatadas++;
      });
      if (empatadas === 1) return mejor;
    }
    return null;
  }

  // Jugada del móvil. "historial" son tus jugadas anteriores, la última al final.
  function jugadaMovil(historial, nivel, azar) {
    azar = azar || Math.random;
    historial = (historial || []).filter(valida);
    if (nivel !== 'listo') return alAzar(azar);
    var p = prediccion(historial);
    // Un poco de azar para que no sea del todo previsible
    if (!p || azar() < 0.15) return alAzar(azar);
    return LE_GANA[p];
  }

  // Añade una jugada al historial y lo recorta
  function anotar(historial, jugada) {
    var h = (historial || []).filter(valida);
    if (valida(jugada)) h.push(jugada);
    if (h.length > MAX_HISTORIAL) h = h.slice(h.length - MAX_HISTORIAL);
    return h;
  }

  var api = {
    JUGADAS: JUGADAS,
    LE_GANA: LE_GANA,
    valida: valida,
    resultado: resultado,
    prediccion: prediccion,
    jugadaMovil: jugadaMovil,
    anotar: anotar
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.PPT = api;
})(this);
