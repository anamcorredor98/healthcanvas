#!/usr/bin/env node
/**
 * build-indice-busqueda.js
 * ─────────────────────────────────────────────────────────────
 * Genera js/indice-busqueda.js: el índice de texto completo que
 * usa el buscador de palabras para saber cuántas coincidencias
 * hay en cada página del sitio.
 *
 * CÓMO USARLO
 *   node build-indice-busqueda.js
 *
 * Corre este script parado en la raíz del sitio (donde están los
 * .html). Lee las páginas incluidas, extrae el texto visible
 * (excluyendo <nav>, <footer> y <script>) y escribe
 * js/indice-busqueda.js con el texto normalizado de cada una.
 *
 * Vuelve a correrlo cada vez que cambies el contenido de texto
 * de alguna de las páginas incluidas, y sube el archivo nuevo.
 *
 * IMPORTANTE: la regla de extracción de texto de este script
 * (excluir nav/footer/script/style) debe coincidir exactamente
 * con la del buscador en tiempo real (js/buscador.js), porque
 * ambos cuentan las coincidencias de la misma forma. Si cambias
 * una, cambia la otra.
 * ─────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

// Páginas incluidas en el buscador, en el orden en que se navega
// entre coincidencias cuando cruzan de página.
const PAGINAS = [
  'index.html',
  'servicios.html',
  'sitio-profesional.html',
  'sitio-chatbot.html',
  'landing-page.html',
  'asi-se-ve.html',
  'por-que.html',
  'contacto.html',
  'tienda.html',
  'terminos.html',
  'politica-privacidad.html',
  'guia-cotizacion.html',
  'guia-creacion-cuentas.html',
];

// Excluidas explícitamente (no se tocan ni se indexan):
// generador-codigo-promocion.html, generador-codigo-referido.html,
// generador-link-privado.html

function quitarBloque(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
  return html.replace(re, ' ');
}

function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes (marcas diacríticas combinantes)
    .toLowerCase();
}

function extraerTexto(html) {
  let contenido = html;

  // Quitar bloques que no deben indexarse
  contenido = quitarBloque(contenido, 'script');
  contenido = quitarBloque(contenido, 'style');
  contenido = quitarBloque(contenido, 'nav');
  contenido = quitarBloque(contenido, 'footer');

  // Quitar comentarios HTML
  contenido = contenido.replace(/<!--[\s\S]*?-->/g, ' ');

  // Quitar todas las etiquetas restantes
  contenido = contenido.replace(/<[^>]+>/g, ' ');

  // Decodificar entidades comunes
  contenido = contenido
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ');

  // Colapsar espacios
  contenido = contenido.replace(/\s+/g, ' ').trim();

  return contenido;
}

function main() {
  const raiz = process.cwd();
  const indice = {};
  const faltantes = [];

  PAGINAS.forEach((archivo) => {
    const ruta = path.join(raiz, archivo);
    if (!fs.existsSync(ruta)) {
      faltantes.push(archivo);
      return;
    }
    const html = fs.readFileSync(ruta, 'utf8');
    const textoPlano = extraerTexto(html);
    indice[archivo] = normalizar(textoPlano);
  });

  if (faltantes.length) {
    console.warn('Aviso: no se encontraron estas páginas (se omitieron):');
    faltantes.forEach((f) => console.warn('  - ' + f));
  }

  const salida =
    '// indice-busqueda.js — generado automáticamente por build-indice-busqueda.js\n' +
    '// No editar a mano. Para actualizar: node build-indice-busqueda.js\n' +
    '// Generado: ' + new Date().toISOString() + '\n\n' +
    'window.HC_INDICE_BUSQUEDA = {\n' +
    '  orden: ' + JSON.stringify(PAGINAS, null, 2) + ',\n' +
    '  paginas: ' + JSON.stringify(indice, null, 2) + '\n' +
    '};\n';

  const dirSalida = path.join(raiz, 'js');
  if (!fs.existsSync(dirSalida)) fs.mkdirSync(dirSalida, { recursive: true });
  fs.writeFileSync(path.join(dirSalida, 'indice-busqueda.js'), salida, 'utf8');

  console.log('Listo: js/indice-busqueda.js generado con ' + Object.keys(indice).length + ' páginas.');
}

main();