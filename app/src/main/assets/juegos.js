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
  }
]);
