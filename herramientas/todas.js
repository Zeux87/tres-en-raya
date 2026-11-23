// Ejecuta todas las pruebas de herramientas/ (cada archivo pruebas*.js).
// Así, al añadir un juego basta con crear su archivo de pruebas: no hay que tocar el workflow.
// Uso: node herramientas/todas.js
'use strict';
var fs = require('fs');
var path = require('path');
var spawnSync = require('child_process').spawnSync;

var archivos = fs.readdirSync(__dirname)
  .filter(function (f) { return /^pruebas.*\.js$/.test(f); })
  .sort();

var fallidos = [];
archivos.forEach(function (f) {
  console.log('▶ ' + f);
  var r = spawnSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  if (r.status !== 0) fallidos.push(f);
});

console.log('');
if (fallidos.length) {
  console.error('Fallan ' + fallidos.length + ' de ' + archivos.length + ': ' + fallidos.join(', '));
  process.exit(1);
}
console.log('Los ' + archivos.length + ' archivos de pruebas pasan');
