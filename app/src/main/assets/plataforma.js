// Plantilla común de los juegos: almacenamiento, partida guardada, marcador,
// botón de volver al menú, vibración y pequeñas utilidades.
// Cada pantalla de juego carga este archivo antes que su propio código:
//   <script src="plataforma.js"></script>
// También se puede cargar desde Node (las pruebas), sin DOM.
(function (raiz, crear) {
  var P = crear(raiz);
  if (typeof module === 'object' && module.exports) module.exports = P;
  else raiz.Plataforma = P;
})(typeof window !== 'undefined' ? window : globalThis, function (raiz) {
  'use strict';

  // ---------- Almacenamiento ----------
  // Todas las claves de un juego empiezan por su prefijo: "<prefijo>.<nombre>".
  // Nunca lanza: si no hay almacenamiento, devuelve el valor por defecto.
  function almacen(prefijo) {
    function clave(nombre) { return prefijo + '.' + nombre; }
    function ls() { return raiz.localStorage; }
    return {
      leer: function (nombre, porDefecto) {
        try {
          var v = JSON.parse(ls().getItem(clave(nombre)));
          return v === null || v === undefined ? porDefecto : v;
        } catch (e) {
          return porDefecto;
        }
      },
      escribir: function (nombre, valor) {
        try { ls().setItem(clave(nombre), JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
      },
      borrar: function (nombre) {
        try { ls().removeItem(clave(nombre)); } catch (e) { /* nada */ }
      }
    };
  }

  // ---------- Partida guardada ----------
  // Guarda el estado de la partida en "<prefijo>.partida" y una marca
  // "<prefijo>.enCurso" que el menú usa para avisar de "partida a medias".
  function partida(prefijo) {
    var a = almacen(prefijo);
    return {
      cargar: function () { return a.leer('partida', null); },
      guardar: function (estado, enCurso) {
        a.escribir('partida', estado);
        a.escribir('enCurso', enCurso !== false);
      },
      borrar: function () {
        a.borrar('partida');
        a.borrar('enCurso');
      },
      enCurso: function () { return a.leer('enCurso', false) === true; }
    };
  }
  function enCurso(prefijo) { return partida(prefijo).enCurso(); }

  // ---------- Marcadores ----------
  // Devuelve (creándolo si falta) el marcador "clave" dentro del objeto
  // "marcadores", con todos los lados a 0. Ej.: marcadorDe(d.marcadores, 'dos', ['X', 'O', 'E'])
  function marcadorDe(marcadores, clave, lados) {
    var m = marcadores[clave];
    if (!m || typeof m !== 'object') m = marcadores[clave] = {};
    lados.forEach(function (l) { if (typeof m[l] !== 'number') m[l] = 0; });
    return m;
  }

  // Ajustes comunes: modo ('movil' | 'dos'), dificultad y marcadores.
  // Corrige lo que venga mal del almacenamiento.
  function ajustes(d, dificultades, difPorDefecto) {
    if (!d || typeof d !== 'object') d = {};
    if (d.modo !== 'movil' && d.modo !== 'dos') d.modo = 'movil';
    if (dificultades.indexOf(d.dificultad) < 0) d.dificultad = difPorDefecto;
    if (!d.marcadores || typeof d.marcadores !== 'object') d.marcadores = {};
    return d;
  }

  // ---------- DOM ----------
  function doc() { return raiz.document; }

  function vibrar(ms) {
    try {
      var A = raiz.Android;
      if (A && A.vibrar) A.vibrar(ms);
      else if (raiz.navigator && raiz.navigator.vibrate) raiz.navigator.vibrate(ms);
    } catch (e) { /* nada */ }
  }

  function saltar(nodo) {
    if (!nodo) return;
    nodo.classList.remove('salto');
    void nodo.offsetWidth; // reinicia la animación
    nodo.classList.add('salto');
  }

  // "‹ Menú": vuelve atrás en vez de abrir otro menú, para no acumular pantallas.
  function conectarVolver(enlace) {
    if (!enlace || enlace.getAttribute('data-conectado')) return enlace;
    enlace.setAttribute('data-conectado', '1');
    enlace.addEventListener('click', function (e) {
      if (raiz.history && raiz.history.length > 1) {
        e.preventDefault();
        raiz.history.back();
      }
    });
    return enlace;
  }

  // Barra superior: "‹ Menú", título y hueco a la derecha. "titulo" puede ser
  // texto o un nodo. Útil en pantallas que se pintan desde JavaScript.
  function barra(titulo) {
    var d = doc();
    var b = d.createElement('div');
    b.className = 'barra';
    var a = d.createElement('a');
    a.className = 'volver';
    a.href = 'index.html';
    a.textContent = '‹ Menú';
    conectarVolver(a);
    var h1 = d.createElement('h1');
    if (typeof titulo === 'string') h1.textContent = titulo;
    else if (titulo) h1.appendChild(titulo);
    b.appendChild(a);
    b.appendChild(h1);
    b.appendChild(d.createElement('span'));
    return b;
  }

  // Marcador de casilleros: un casillero por lado (p. ej. X, empates, O).
  //   var mc = Plataforma.marcador(document.getElementById('marcador'), [
  //     { id: 'X', nombre: 'Tú (X)', color: 'var(--x)' },
  //     { id: 'E', nombre: 'Empates' },
  //     { id: 'O', nombre: 'Móvil (O)', color: 'var(--o)', punto: true }
  //   ]);
  //   mc.pintar({ X: 2, O: 1, E: 0 }); mc.turno('X'); mc.saltar('E'); mc.nombres({ X: 'Jugador X' });
  // "color" colorea los puntos y el borde del turno; "colorTexto" cambia solo
  // el de los puntos; "punto" pone un círculo del color junto al nombre.
  function marcador(contenedor, lados) {
    var d = doc();
    var cajas = {};
    contenedor.classList.add('marcador');
    contenedor.innerHTML = '';
    lados.forEach(function (l) {
      var c = d.createElement('div');
      c.className = 'casillero' + (l.color ? '' : ' neutro');
      if (l.color) c.style.setProperty('--color', l.color);
      if (l.colorTexto) c.style.setProperty('--color-texto', l.colorTexto);
      var n = d.createElement('div');
      n.className = 'nombre';
      if (l.punto) n.appendChild(d.createElement('i'));
      var t = d.createElement('span');
      t.textContent = l.nombre || '';
      n.appendChild(t);
      var p = d.createElement('div');
      p.className = 'puntos';
      p.textContent = '0';
      c.appendChild(n);
      c.appendChild(p);
      contenedor.appendChild(c);
      cajas[l.id] = { caja: c, nombre: t, puntos: p };
    });
    return {
      pintar: function (m) {
        for (var id in cajas) cajas[id].puntos.textContent = String((m && m[id]) || 0);
      },
      nombres: function (n) {
        for (var id in n) if (cajas[id]) cajas[id].nombre.textContent = n[id];
      },
      turno: function (id) {
        for (var k in cajas) cajas[k].caja.classList.toggle('turno', k === id);
      },
      saltar: function (id) { if (cajas[id]) saltar(cajas[id].caja); },
      caja: function (id) { return cajas[id] && cajas[id].caja; }
    };
  }

  // Selector de opciones (.segmentos) con botones data-valor.
  // Marca el activo y avisa al cambiar: segmentos(nodo, 'normal', function (v) { ... })
  function segmentos(nodo, valor, alCambiar) {
    var api = {
      poner: function (v) {
        valor = v;
        var bs = nodo.querySelectorAll('button');
        for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('activo', bs[i].getAttribute('data-valor') === v);
      },
      ver: function (si) { nodo.classList.toggle('oculto', !si); }
    };
    nodo.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      var v = b && b.getAttribute('data-valor');
      if (!v || v === valor) return;
      api.poner(v);
      alCambiar(v);
    });
    api.poner(valor);
    return api;
  }

  // Conecta los "‹ Menú" escritos en el HTML de la página.
  if (raiz.document && raiz.document.querySelectorAll) {
    var conectarTodos = function () {
      var vs = raiz.document.querySelectorAll('a.volver');
      for (var i = 0; i < vs.length; i++) conectarVolver(vs[i]);
    };
    if (raiz.document.readyState === 'loading') raiz.document.addEventListener('DOMContentLoaded', conectarTodos);
    else conectarTodos();
  }

  return {
    almacen: almacen,
    partida: partida,
    enCurso: enCurso,
    marcadorDe: marcadorDe,
    ajustes: ajustes,
    vibrar: vibrar,
    saltar: saltar,
    conectarVolver: conectarVolver,
    barra: barra,
    marcador: marcador,
    segmentos: segmentos
  };
});
