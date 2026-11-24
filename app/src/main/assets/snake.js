// Lógica de Snake: la serpiente avanza una casilla en cada paso, crece al comer
// y muere si choca consigo misma. No hay paredes: si sale por un lado, entra por el contrario.
// Estado (se puede guardar con JSON):
//   { cols, filas, cuerpo: [casillas, la cabeza primero], dir, cola: [giros pendientes],
//     comida, puntos, vivo, lleno }
// Casilla = fila * cols + columna. Direcciones: 'arriba', 'abajo', 'izq', 'der'.
(function (raiz) {
  'use strict';

  var MOV = { arriba: [-1, 0], abajo: [1, 0], izq: [0, -1], der: [0, 1] };
  var CONTRARIA = { arriba: 'abajo', abajo: 'arriba', izq: 'der', der: 'izq' };
  var MAX_COLA = 2; // giros que se recuerdan si tocas muy rápido

  function nuevo(cols, filas, azar) {
    var f = Math.floor(filas / 2);
    var c = Math.floor(cols / 2) - 1;
    var e = {
      cols: cols,
      filas: filas,
      cuerpo: [f * cols + c, f * cols + c - 1, f * cols + c - 2],
      dir: 'der',
      cola: [],
      comida: -1,
      puntos: 0,
      vivo: true,
      lleno: false
    };
    ponerComida(e, azar);
    return e;
  }

  function ponerComida(e, azar) {
    azar = azar || Math.random;
    var ocupadas = {};
    e.cuerpo.forEach(function (i) { ocupadas[i] = true; });
    var libres = [];
    for (var i = 0; i < e.cols * e.filas; i++) if (!ocupadas[i]) libres.push(i);
    e.comida = libres.length ? libres[Math.floor(azar() * libres.length)] : -1;
    return e.comida;
  }

  // Apunta un giro. No se puede dar media vuelta ni repetir la misma dirección.
  function girar(e, d) {
    if (!MOV[d] || !e.vivo) return false;
    var ultima = e.cola.length ? e.cola[e.cola.length - 1] : e.dir;
    if (d === ultima || d === CONTRARIA[ultima] || e.cola.length >= MAX_COLA) return false;
    e.cola.push(d);
    return true;
  }

  // Avanza un paso. Devuelve 'come', 'muere', 'gana' o 'nada'.
  function paso(e, azar) {
    if (!e.vivo) return 'muere';
    if (e.cola.length) e.dir = e.cola.shift();
    var cabeza = e.cuerpo[0];
    // Sin bordes: al salir por arriba entra por abajo, y al salir por un lado entra por el otro
    var f = (Math.floor(cabeza / e.cols) + MOV[e.dir][0] + e.filas) % e.filas;
    var c = (cabeza % e.cols + MOV[e.dir][1] + e.cols) % e.cols;
    var nueva = f * e.cols + c;
    var come = nueva === e.comida;
    // La cola se mueve a la vez, así que se puede entrar en la casilla que deja (si no come)
    var hasta = come ? e.cuerpo.length : e.cuerpo.length - 1;
    for (var i = 0; i < hasta; i++) {
      if (e.cuerpo[i] === nueva) {
        e.vivo = false;
        return 'muere';
      }
    }
    e.cuerpo.unshift(nueva);
    if (!come) {
      e.cuerpo.pop();
      return 'nada';
    }
    e.puntos++;
    if (ponerComida(e, azar) < 0) {
      e.vivo = false;
      e.lleno = true;
      return 'gana';
    }
    return 'come';
  }

  // Milisegundos por paso: va acelerando un poco según comes
  function velocidad(nivel, puntos) {
    var base = { lento: 200, normal: 145, rapido: 100 }[nivel] || 145;
    var minimo = { lento: 120, normal: 85, rapido: 60 }[nivel] || 85;
    return Math.max(minimo, Math.round(base - puntos * 2));
  }

  function valido(e) {
    if (!e || typeof e !== 'object' || !Array.isArray(e.cuerpo) || !Array.isArray(e.cola)) return false;
    if (!(e.cols > 0 && e.filas > 0) || !MOV[e.dir] || e.cuerpo.length < 1) return false;
    var total = e.cols * e.filas;
    return e.cuerpo.every(function (i) { return i >= 0 && i < total; });
  }

  var api = {
    MOV: MOV,
    CONTRARIA: CONTRARIA,
    nuevo: nuevo,
    ponerComida: ponerComida,
    girar: girar,
    paso: paso,
    velocidad: velocidad,
    valido: valido
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Snake = api;
})(this);
