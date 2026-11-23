// Lista de juegos de la app. El menú (index.html) se genera a partir de ella
// y las pruebas (herramientas/pruebas-catalogo.js) comprueban que cada juego
// tiene su página y usa la plantilla común.
//
// Para añadir un juego, añade una entrada aquí:
//   id:     prefijo de sus datos guardados ("<id>.partida", "<id>.v1"...)
//   pagina: archivo HTML del juego, en esta misma carpeta
//   titulo, texto: lo que se ve en la tarjeta del menú
//   icono:  dibujo SVG de 76×76 (solo el contenido, sin la etiqueta <svg>)
(function (raiz, juegos) {
  if (typeof module === 'object' && module.exports) module.exports = juegos;
  else raiz.JUEGOS = juegos;
})(typeof window !== 'undefined' ? window : globalThis, [
  {
    id: 'tresenraya',
    pagina: 'tresenraya.html',
    titulo: '3 en raya',
    texto: 'Contra el móvil (3 niveles) o a dos jugadores',
    icono:
      '<rect width="76" height="76" fill="#4b3fd6"/>' +
      '<path d="M31 16v44M45 16v44M16 31h44M16 45h44" stroke="#fff" stroke-opacity=".55" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M19 19l8 8M27 19l-8 8M34 34l8 8M42 34l-8 8M49 49l8 8M57 49l-8 8" stroke="#ff7a7a" stroke-width="3.2" stroke-linecap="round"/>' +
      '<circle cx="53" cy="23" r="4.6" fill="none" stroke="#4fe0d3" stroke-width="3"/>' +
      '<circle cx="23" cy="53" r="4.6" fill="none" stroke="#4fe0d3" stroke-width="3"/>'
  },
  {
    id: 'conecta4',
    pagina: 'conecta4.html',
    titulo: 'Conecta 4',
    texto: 'Contra el móvil (3 niveles) o a dos jugadores',
    icono:
      '<rect width="76" height="76" fill="#2f5fd0"/>' +
      '<g fill="#1d3f99"><circle cx="16" cy="16" r="7"/><circle cx="31" cy="16" r="7"/><circle cx="46" cy="16" r="7"/><circle cx="16" cy="31" r="7"/><circle cx="31" cy="31" r="7"/><circle cx="16" cy="46" r="7"/></g>' +
      '<circle cx="31" cy="61" r="7" fill="#f5bd2e"/><circle cx="46" cy="46" r="7" fill="#f5bd2e"/><circle cx="46" cy="61" r="7" fill="#f5bd2e"/><circle cx="61" cy="31" r="7" fill="#f5bd2e"/><circle cx="61" cy="46" r="7" fill="#f5bd2e"/>' +
      '<circle cx="16" cy="61" r="7" fill="#e8455a"/><circle cx="31" cy="46" r="7" fill="#e8455a"/><circle cx="46" cy="31" r="7" fill="#e8455a"/><circle cx="61" cy="16" r="7" fill="#e8455a"/><circle cx="61" cy="61" r="7" fill="#e8455a"/>' +
      '<path d="M16 61L61 16" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 4" opacity=".85"/>'
  },
  {
    id: 'flota',
    pagina: 'flota.html',
    titulo: 'Hundir la flota',
    texto: '2 jugadores en el mismo móvil',
    icono:
      '<rect width="76" height="76" fill="#1d5f9e"/>' +
      '<path d="M8 52c6 0 6-4 12-4s6 4 12 4 6-4 12-4 6 4 12 4 6-4 12-4" fill="none" stroke="#9fd3ff" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M14 40h46l-7 9H22z" fill="#e8eef6"/>' +
      '<rect x="28" y="30" width="16" height="10" rx="2" fill="#e8eef6"/>' +
      '<rect x="34" y="22" width="4" height="9" fill="#e8eef6"/>' +
      '<circle cx="58" cy="20" r="6" fill="#ff6b6b"/>' +
      '<path d="M54 16l8 8M62 16l-8 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'ppt',
    pagina: 'ppt.html',
    titulo: 'Piedra, papel o tijera',
    texto: 'Contra el móvil, que aprende tus manías',
    icono:
      '<rect width="76" height="76" fill="#e0703a"/>' +
      '<text x="22" y="34" font-size="24" text-anchor="middle">✊</text>' +
      '<text x="54" y="34" font-size="24" text-anchor="middle">✋</text>' +
      '<text x="38" y="64" font-size="24" text-anchor="middle">✌️</text>'
  },
  {
    id: 'buscaminas',
    pagina: 'buscaminas.html',
    titulo: 'Buscaminas',
    texto: 'Tres tamaños, banderas y récord de tiempo',
    icono:
      '<rect width="76" height="76" fill="#5b6b86"/>' +
      '<g fill="#b9c6d6"><rect x="8" y="8" width="18" height="18" rx="4"/><rect x="29" y="8" width="18" height="18" rx="4"/><rect x="50" y="29" width="18" height="18" rx="4"/><rect x="8" y="50" width="18" height="18" rx="4"/><rect x="50" y="50" width="18" height="18" rx="4"/></g>' +
      '<g fill="#eef1f5"><rect x="50" y="8" width="18" height="18" rx="4"/><rect x="8" y="29" width="18" height="18" rx="4"/><rect x="29" y="29" width="18" height="18" rx="4"/><rect x="29" y="50" width="18" height="18" rx="4"/></g>' +
      '<text x="17" y="43" font-size="14" font-weight="800" fill="#2d6cdf" text-anchor="middle" font-family="sans-serif">1</text>' +
      '<text x="38" y="43" font-size="14" font-weight="800" fill="#2a9a4b" text-anchor="middle" font-family="sans-serif">2</text>' +
      '<path d="M57 54v11M57 54l8 3-8 3" stroke="#e0433f" stroke-width="2.4" fill="#e0433f" stroke-linejoin="round"/>'
  },
  {
    id: 'snake',
    pagina: 'snake.html',
    titulo: 'Snake',
    texto: 'Come, crece y no te muerdas',
    icono:
      '<rect width="76" height="76" fill="#1f7a43"/>' +
      '<path d="M14 58h22V38h26V20" fill="none" stroke="#7be3a5" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="62" cy="20" r="6.5" fill="#bdf2d2"/>' +
      '<circle cx="60" cy="18" r="1.6" fill="#1f7a43"/><circle cx="64" cy="18" r="1.6" fill="#1f7a43"/>' +
      '<circle cx="24" cy="24" r="5" fill="#ff6b6b"/>'
  },
  {
    id: '2048',
    pagina: '2048.html',
    titulo: '2048',
    texto: 'Desliza y junta números hasta llegar a 2048',
    icono:
      '<rect width="76" height="76" fill="#bdb1a3"/>' +
      '<rect x="7" y="7" width="29" height="29" rx="5" fill="#eee4da"/>' +
      '<rect x="40" y="7" width="29" height="29" rx="5" fill="#f2b179"/>' +
      '<rect x="7" y="40" width="29" height="29" rx="5" fill="#f65e3b"/>' +
      '<rect x="40" y="40" width="29" height="29" rx="5" fill="#edc22e"/>' +
      '<g font-family="sans-serif" font-weight="800" text-anchor="middle"><text x="21.5" y="27" font-size="16" fill="#776e65">2</text><text x="54.5" y="27" font-size="16" fill="#fff">8</text><text x="21.5" y="60" font-size="14" fill="#fff">64</text><text x="54.5" y="59" font-size="10" fill="#fff">2048</text></g>'
  },
  {
    id: 'memoria',
    pagina: 'memoria.html',
    titulo: 'Memoria',
    texto: 'Encuentra las parejas, solo (3 niveles) o a dos jugadores',
    icono:
      '<rect width="76" height="76" fill="#6a45c9"/>' +
      '<rect x="10" y="12" width="24" height="30" rx="5" fill="#9a73ee"/>' +
      '<circle cx="22" cy="27" r="6" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.5"/>' +
      '<rect x="42" y="12" width="24" height="30" rx="5" fill="#fff"/>' +
      '<circle cx="54" cy="27" r="7" fill="#ef5b5b"/>' +
      '<path d="M54 20c1-3 3-4 5-4" stroke="#1fa39a" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
      '<rect x="10" y="48" width="24" height="18" rx="5" fill="#fff" opacity=".95"/>' +
      '<circle cx="22" cy="57" r="5" fill="#ef5b5b"/>' +
      '<rect x="42" y="48" width="24" height="18" rx="5" fill="#9a73ee"/>'
  },
  {
    id: 'ahorcado',
    pagina: 'ahorcado.html',
    titulo: 'Ahorcado',
    texto: 'Adivina palabras en español, solo o a dos jugadores',
    icono:
      '<rect width="76" height="76" fill="#2f8a6e"/>' +
      '<path d="M14 64h30M24 64V12h28M24 22l10-10" stroke="#e9d8c4" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M52 12v8" stroke="#fff" stroke-opacity=".7" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="52" cy="26" r="6" fill="none" stroke="#fff" stroke-width="3"/>' +
      '<path d="M52 32v15M52 37l-7 6M52 37l7 6M52 47l-6 10M52 47l6 10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
  }
]);
