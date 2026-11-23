// Lógica del Ahorcado: palabras en español, letras probadas, fallos y resultado.
// Las letras se comparan sin tildes (la A descubre también la Á, la U también la Ü),
// pero la Ñ es una letra distinta de la N, como en el teclado español.
(function (raiz) {
  'use strict';

  var MAX_FALLOS = 6; // cabeza, cuerpo, dos brazos y dos piernas
  var MIN_LARGO = 3;
  var MAX_LARGO = 14;
  var LETRAS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

  var CATEGORIAS = {
    animales: {
      nombre: 'Animales',
      palabras: ['ARAÑA', 'BALLENA', 'BÚHO', 'CABALLO', 'CANGREJO', 'CARACOL', 'CIERVO', 'CIGÜEÑA',
        'COCODRILO', 'CONEJO', 'DELFÍN', 'ELEFANTE', 'ERIZO', 'FLAMENCO', 'GAVIOTA', 'GORILA',
        'HORMIGA', 'JABALÍ', 'JIRAFA', 'LAGARTIJA', 'LEÓN', 'LECHUZA', 'LOBO', 'MARIPOSA',
        'MURCIÉLAGO', 'NUTRIA', 'OSO', 'OVEJA', 'PATO', 'PINGÜINO', 'PULPO', 'RANA', 'RATÓN',
        'SARDINA', 'SERPIENTE', 'TIBURÓN', 'TORTUGA', 'TUCÁN', 'VACA', 'ZORRO']
    },
    comida: {
      nombre: 'Comida',
      palabras: ['ACEITUNA', 'AGUACATE', 'ALBÓNDIGA', 'ARROZ', 'BOCADILLO', 'BIZCOCHO', 'CALABAZA',
        'CEBOLLA', 'CEREZA', 'CHORIZO', 'CHURROS', 'CROQUETA', 'ENSALADA', 'FRESA', 'GALLETA',
        'GAZPACHO', 'HELADO', 'HUEVO', 'JAMÓN', 'LECHUGA', 'LENTEJAS', 'LIMÓN', 'MAGDALENA',
        'MANZANA', 'MELOCOTÓN', 'NARANJA', 'PAELLA', 'PIMIENTO', 'PIÑA', 'PLÁTANO', 'QUESO',
        'SANDÍA', 'TOMATE', 'TORTILLA', 'TURRÓN', 'UVA', 'ZANAHORIA']
    },
    lugares: {
      nombre: 'Lugares',
      palabras: ['ALEMANIA', 'ARGENTINA', 'BARCELONA', 'BILBAO', 'BRASIL', 'CANARIAS', 'CÓRDOBA',
        'CHILE', 'CHINA', 'ESPAÑA', 'FRANCIA', 'GRANADA', 'GRECIA', 'ITALIA', 'JAPÓN', 'LISBOA',
        'LONDRES', 'MADRID', 'MALLORCA', 'MARRUECOS', 'MÉXICO', 'NORUEGA', 'PARÍS', 'PERÚ',
        'PORTUGAL', 'ROMA', 'SALAMANCA', 'SEVILLA', 'SUIZA', 'TOLEDO', 'URUGUAY', 'VALENCIA',
        'ZARAGOZA']
    },
    cosas: {
      nombre: 'Cosas',
      palabras: ['ALMOHADA', 'BICICLETA', 'BOLÍGRAFO', 'BOTELLA', 'BUFANDA', 'CAMISETA', 'CUADERNO',
        'CUCHARA', 'ESCALERA', 'ESPEJO', 'GUITARRA', 'LÁMPARA', 'LLAVERO', 'MALETA', 'MOCHILA',
        'NEVERA', 'ORDENADOR', 'PARAGUAS', 'PELOTA', 'PIZARRA', 'RELOJ', 'SARTÉN', 'SILLÓN',
        'TELÉFONO', 'TIJERAS', 'VENTANA', 'ZAPATILLA']
    }
  };

  var SIN_TILDE = { 'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I', 'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U' };

  // Letra base de una letra: 'á' -> 'A', 'ü' -> 'U', 'ñ' -> 'Ñ'. Devuelve null si no es letra válida.
  function normalizar(letra) {
    if (typeof letra !== 'string' || letra.length !== 1) return null;
    var l = letra.toUpperCase();
    if (SIN_TILDE[l]) l = SIN_TILDE[l];
    return LETRAS.indexOf(l) >= 0 ? l : null;
  }

  // Limpia una palabra escrita a mano (modo 2 jugadores).
  // Devuelve { palabra } o { error } con el motivo en español.
  function limpiarPalabra(texto) {
    var p = String(texto || '').trim().toUpperCase();
    if (!p) return { error: 'Escribe una palabra' };
    if (/\s/.test(p)) return { error: 'Solo una palabra, sin espacios' };
    for (var i = 0; i < p.length; i++) {
      if (!normalizar(p[i])) return { error: 'Solo letras (se admiten tildes y ñ)' };
    }
    if (p.length < MIN_LARGO) return { error: 'Mínimo ' + MIN_LARGO + ' letras' };
    if (p.length > MAX_LARGO) return { error: 'Máximo ' + MAX_LARGO + ' letras' };
    return { palabra: p };
  }

  function todasLasPalabras() {
    var r = [];
    Object.keys(CATEGORIAS).forEach(function (k) {
      CATEGORIAS[k].palabras.forEach(function (p) { r.push({ palabra: p, categoria: k }); });
    });
    return r;
  }

  // Elige una palabra al azar de la categoría ('todas' para mezclar), evitando las recientes si se puede
  function elegir(categoria, azar, recientes) {
    azar = azar || Math.random;
    recientes = recientes || [];
    var lista = CATEGORIAS[categoria]
      ? CATEGORIAS[categoria].palabras.map(function (p) { return { palabra: p, categoria: categoria }; })
      : todasLasPalabras();
    var nuevas = lista.filter(function (x) { return recientes.indexOf(x.palabra) < 0; });
    if (nuevas.length) lista = nuevas;
    return lista[Math.floor(azar() * lista.length)];
  }

  function nueva(palabra, pista) {
    return { palabra: palabra, pista: pista || '', probadas: [], fallos: 0 };
  }

  function contiene(e, base) {
    for (var i = 0; i < e.palabra.length; i++) if (normalizar(e.palabra[i]) === base) return true;
    return false;
  }

  // ¿Está descubierta toda la palabra?
  function completa(e) {
    for (var i = 0; i < e.palabra.length; i++) {
      if (e.probadas.indexOf(normalizar(e.palabra[i])) < 0) return false;
    }
    return true;
  }

  function resultado(e) {
    if (completa(e)) return 'gana';
    if (e.fallos >= MAX_FALLOS) return 'pierde';
    return null;
  }

  // Prueba una letra: 'acierto', 'fallo', 'repetida', 'invalida' o 'terminada'
  function probar(e, letra) {
    if (resultado(e)) return 'terminada';
    var base = normalizar(letra);
    if (!base) return 'invalida';
    if (e.probadas.indexOf(base) >= 0) return 'repetida';
    e.probadas.push(base);
    if (contiene(e, base)) return 'acierto';
    e.fallos++;
    return 'fallo';
  }

  // La palabra con las letras sin descubrir a null (las descubiertas con su tilde original)
  function mascara(e) {
    var r = [];
    for (var i = 0; i < e.palabra.length; i++) {
      r.push(e.probadas.indexOf(normalizar(e.palabra[i])) >= 0 ? e.palabra[i] : null);
    }
    return r;
  }

  var api = {
    MAX_FALLOS: MAX_FALLOS,
    MIN_LARGO: MIN_LARGO,
    MAX_LARGO: MAX_LARGO,
    LETRAS: LETRAS,
    CATEGORIAS: CATEGORIAS,
    normalizar: normalizar,
    limpiarPalabra: limpiarPalabra,
    todasLasPalabras: todasLasPalabras,
    elegir: elegir,
    nueva: nueva,
    probar: probar,
    completa: completa,
    resultado: resultado,
    mascara: mascara
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Ahorcado = api;
})(this);
