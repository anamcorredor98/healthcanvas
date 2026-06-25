// ===========================
// TIENDA — tienda.js
// ===========================

// ── UTILIDADES ──────────────────────────────────────────────────────────────

function formatCOP(valor) {
  return '$' + valor.toLocaleString('es-CO');
}

function parseCOP(texto) {
  return parseInt(texto.replace(/\D/g, '')) || 0;
}

// ── PRECIOS DE ELEMENTOS ────────────────────────────────────────────────────
// Sincronizado con servicios.html (corregido)
const PRECIOS = {
  // Planes
  'Sitio Esencial Básico': 525000,
  'Sitio Esencial Pro': 915000,
  'Sitio Profesional Básico': 1045000,
  'Sitio Profesional Pro': 1625000,
  'Sitio con Chatbot Básico': 1675000,
  'Sitio con Chatbot Pro': 3085000,
  // Elementos sueltos
  'Formulario de contacto': 75000,
  'Animaciones de desplazamiento': 55000,
  'Sección de testimonios': 110000,
  'Sección de preguntas frecuentes': 110000,
  'Diseño personalizado': 200000,
  'Sección de especialidades detalladas': 110000,
  'PDFs descargables': 130000,
  'Agendamiento con Calendly': 160000,
  'Optimización para motores de búsqueda': 160000,
  'Buscador de palabras': 300000,
  'Chatbot básico': 500000,
  'Chatbot con IA': 675000,
  'Asistente de agendamiento con IA': 325000,
  // Complementos
  'Gestión de dominio y hosting': 180000,
  'Plantilla de política de privacidad': 85000,
  'Logo simple (HealthCanvas)': 200000,
  'Logo profesional (diseñador colaborador)': 0,
  'Carrusel de imágenes': 130000,
  'Galería de fotos/videos estilo Instagram': 160000,
  'Post de inauguración Básico': 55000,
  'Post de inauguración Pro': 110000,
  'QR personalizado': 45000,
  'QR de WhatsApp/Instagram': 45000,
  'Tarjeta de presentación sin QR': 85000,
  'Tarjeta de presentación con QR': 140000,
};

// ── ELEMENTOS DEL DOM ───────────────────────────────────────────────────────

const formCliente = document.getElementById('tiForm');
const nombreInput = document.getElementById('ti-nombre');
const emailInput = document.getElementById('ti-email');
const telefonoInput = document.getElementById('ti-telefono');

const carritoVacio = document.getElementById('carritoVacio');
const carritoItems = document.getElementById('carritoItems');
const itemsList = document.getElementById('itemsList');
const resumenVacio = document.getElementById('resumenVacio');
const resumenContenido = document.getElementById('resumenContenido');
const resumenLista = document.getElementById('resumenLista');

const subtotalValue = document.getElementById('subtotalValue');
const ivaValue = document.getElementById('ivaValue');
const ivaPorc = document.getElementById('ivaPorc');
const descuentoLinea = document.getElementById('descuentoLinea');
const descuentoValue = document.getElementById('descuentoValue');
const descuentoPorc = document.getElementById('descuentoPorc');
const totalValue = document.getElementById('totalValue');

const codigoInput = document.getElementById('codigoInput');
const aplicarCodigo = document.getElementById('aplicarCodigo');
const codigoMensaje = document.getElementById('codigoMensaje');

const volverCotizador = document.getElementById('volverCotizador');
const limpiarCarrito = document.getElementById('limpiarCarrito');
const exportarPDF = document.getElementById('exportarPDF');
const procesarPago = document.getElementById('procesarPago');
const upsellMessage = document.getElementById('upsellMessage');

// ── ESTADO GLOBAL ───────────────────────────────────────────────────────────

let carrito = [];
let ivaActual = 0; // 0% por ahora
let descuentoPorcentaje = 0;
let descuentoAplicado = false;

// ── INICIALIZACIÓN ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  cargarCarritoDesdeParams();
  cargarClienteDesdeLocalStorage();
  actualizarUI();

  // Event listeners
  aplicarCodigo.addEventListener('click', aplicarCodigoDescuento);
  volverCotizador.addEventListener('click', () => {
    // Guardar cliente antes de salir
    guardarClienteEnLocalStorage();
    window.location.href = 'servicios.html';
  });
  limpiarCarrito.addEventListener('click', limpiarCarritoCompleto);
  exportarPDF.addEventListener('click', generarPDF);
  procesarPago.addEventListener('click', () => {
    alert('La funcionalidad de pago estará disponible próximamente.');
  });

  // Guardar cliente en localStorage cuando escriba
  nombreInput.addEventListener('blur', guardarClienteEnLocalStorage);
  emailInput.addEventListener('blur', guardarClienteEnLocalStorage);
  telefonoInput.addEventListener('blur', guardarClienteEnLocalStorage);
});

// ── CARGAR CARRITO DESDE PARAMS ─────────────────────────────────────────────

function cargarCarritoDesdeParams() {
  const params = new URLSearchParams(window.location.search);
  
  // plan=X (opcional)
  const plan = params.get('plan');
  if (plan) {
    carrito.push({ nombre: plan, precio: PRECIOS[plan] || 0 });
  }

  // addons=X,Y,Z (opcional)
  const addons = params.get('addons');
  if (addons) {
    addons.split(',').forEach(addon => {
      const nombre = decodeURIComponent(addon);
      carrito.push({ nombre, precio: PRECIOS[nombre] || 0 });
    });
  }
}

// ── CARGAR/GUARDAR CLIENTE EN LOCALSTORAGE ──────────────────────────────────

function cargarClienteDesdeLocalStorage() {
  const cliente = JSON.parse(localStorage.getItem('healthcanvasCliente') || '{}');
  if (cliente.nombre) nombreInput.value = cliente.nombre;
  if (cliente.email) emailInput.value = cliente.email;
  if (cliente.telefono) telefonoInput.value = cliente.telefono;
}

function guardarClienteEnLocalStorage() {
  const cliente = {
    nombre: nombreInput.value,
    email: emailInput.value,
    telefono: telefonoInput.value,
  };
  localStorage.setItem('healthcanvasCliente', JSON.stringify(cliente));
}

// ── ACTUALIZAR UI ───────────────────────────────────────────────────────────

function actualizarUI() {
  if (carrito.length === 0) {
    carritoVacio.style.display = 'block';
    carritoItems.style.display = 'none';
    resumenVacio.style.display = 'block';
    resumenContenido.style.display = 'none';
    return;
  }

  carritoVacio.style.display = 'none';
  carritoItems.style.display = 'flex';
  resumenVacio.style.display = 'none';
  resumenContenido.style.display = 'flex';

  renderizarItems();
  calcularTotales();
}

// ── RENDERIZAR ITEMS ────────────────────────────────────────────────────────

function renderizarItems() {
  itemsList.innerHTML = carrito.map((item, index) => `
    <div class="ti-item">
      <div class="ti-item__info">
        <div class="ti-item__nombre">${item.nombre}</div>
        <div class="ti-item__precio">${formatCOP(item.precio)}</div>
      </div>
      <button type="button" class="ti-item__eliminar" onclick="eliminarItem(${index})" title="Eliminar">
        ✕
      </button>
    </div>
  `).join('');
}

// ── ELIMINAR ITEM ───────────────────────────────────────────────────────────

function eliminarItem(index) {
  carrito.splice(index, 1);
  actualizarUI();
}

// ── LIMPIAR CARRITO ─────────────────────────────────────────────────────────

function limpiarCarritoCompleto() {
  if (confirm('¿Estás seguro de que deseas limpiar el carrito completamente?')) {
    carrito = [];
    descuentoPorcentaje = 0;
    descuentoAplicado = false;
    codigoInput.value = '';
    codigoMensaje.style.display = 'none';
    actualizarUI();
  }
}

// ── APLICAR CÓDIGO DE DESCUENTO ─────────────────────────────────────────────

function aplicarCodigoDescuento() {
  const codigo = codigoInput.value.trim().toUpperCase();

  if (!codigo) {
    mostrarMensajeCodigo('Por favor ingresa un código', false);
    return;
  }

  // Aquí va la lógica de validación de código
  // Por ahora, solo validamos códigos de ejemplo
  const codigosValidos = {
    'AMIGO2026': 20,      // 20% descuento
    'REFERRAL': 5,        // 5% descuento
    'PROMO2026': 10,      // 10% descuento
  };

  if (codigosValidos[codigo]) {
    descuentoPorcentaje = codigosValidos[codigo];
    descuentoAplicado = true;
    mostrarMensajeCodigo(`✓ Código aplicado: ${descuentoPorcentaje}% de descuento`, true);
    calcularTotales();
  } else {
    descuentoAplicado = false;
    descuentoPorcentaje = 0;
    mostrarMensajeCodigo('Código no válido', false);
  }
}

function mostrarMensajeCodigo(mensaje, esExito) {
  codigoMensaje.textContent = mensaje;
  codigoMensaje.style.display = 'block';
  codigoMensaje.style.color = esExito ? '#2e7d32' : '#c62828';
}

// ── CALCULAR TOTALES ────────────────────────────────────────────────────────

function calcularTotales() {
  // Subtotal
  const subtotal = carrito.reduce((suma, item) => suma + item.precio, 0);

  // IVA
  const iva = Math.round(subtotal * (ivaActual / 100));

  // Descuento
  const descuento = descuentoAplicado 
    ? Math.round(subtotal * (descuentoPorcentaje / 100))
    : 0;

  // Total
  const total = subtotal + iva - descuento;

  // Actualizar UI
  subtotalValue.textContent = formatCOP(subtotal);
  ivaValue.textContent = formatCOP(iva);
  ivaPorc.textContent = `(${ivaActual}%)`;

  if (descuentoAplicado) {
    descuentoLinea.style.display = 'flex';
    descuentoValue.textContent = `-${formatCOP(descuento)}`;
    descuentoPorc.textContent = `(-${descuentoPorcentaje}%)`;
  } else {
    descuentoLinea.style.display = 'none';
  }

  totalValue.textContent = formatCOP(total);

  // Renderizar lista de resumen
  resumenLista.innerHTML = carrito.map(item => `
    <li class="ti-resumen__item">
      <span class="ti-resumen__item-nombre">${item.nombre}</span>
      <span class="ti-resumen__item-precio">${formatCOP(item.precio)}</span>
    </li>
  `).join('');

  // Mostrar mensaje upsell si carrito < 500k (ejemplo)
  const totalSinDescuento = subtotal + iva;
  if (totalSinDescuento < 500000) {
    upsellMessage.style.display = 'block';
  } else {
    upsellMessage.style.display = 'none';
  }
}

// ── GENERAR PDF ─────────────────────────────────────────────────────────────

function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const nombre = nombreInput.value || 'Cliente';
  const ancho = doc.internal.pageSize.getWidth();
  const altoPageina = doc.internal.pageSize.getHeight();

  let yPos = 20;
  const margen = 20;
  const anchoUtil = ancho - 2 * margen;

  // Encabezado
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`Cotización de HealthCanvas`, margen, yPos);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  yPos += 12;
  doc.text(`Para: ${nombre}`, margen, yPos);

  yPos += 8;
  const fecha = new Date().toLocaleDateString('es-CO');
  doc.text(`Fecha: ${fecha}`, margen, yPos);

  // Línea separadora
  yPos += 10;
  doc.setDrawColor(173, 216, 230);
  doc.line(margen, yPos, ancho - margen, yPos);

  // Items
  yPos += 10;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Concepto', margen, yPos);
  doc.text('Valor', ancho - margen - 30, yPos, { align: 'right' });

  yPos += 8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  carrito.forEach(item => {
    if (yPos > altoPageina - 40) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(item.nombre, margen, yPos);
    doc.text(formatCOP(item.precio), ancho - margen - 5, yPos, { align: 'right' });
    yPos += 8;
  });

  // Línea separadora
  yPos += 4;
  doc.setDrawColor(173, 216, 230);
  doc.line(margen, yPos, ancho - margen, yPos);

  // Totales
  yPos += 8;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);

  const subtotal = carrito.reduce((suma, item) => suma + item.precio, 0);
  const iva = Math.round(subtotal * (ivaActual / 100));
  const descuento = descuentoAplicado 
    ? Math.round(subtotal * (descuentoPorcentaje / 100))
    : 0;
  const total = subtotal + iva - descuento;

  doc.text('Subtotal:', margen, yPos);
  doc.text(formatCOP(subtotal), ancho - margen - 5, yPos, { align: 'right' });

  yPos += 8;
  doc.text(`IVA (${ivaActual}%):`, margen, yPos);
  doc.text(formatCOP(iva), ancho - margen - 5, yPos, { align: 'right' });

  if (descuentoAplicado) {
    yPos += 8;
    doc.text(`Descuento (-${descuentoPorcentaje}%):`, margen, yPos);
    doc.setTextColor(229, 57, 53);
    doc.text(`-${formatCOP(descuento)}`, ancho - margen - 5, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  yPos += 10;
  doc.setDrawColor(173, 216, 230);
  doc.line(margen, yPos, ancho - margen, yPos);

  yPos += 8;
  doc.setFontSize(12);
  doc.text('TOTAL:', margen, yPos);
  doc.setTextColor(27, 79, 114);
  doc.text(formatCOP(total), ancho - margen - 5, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Pie de página
  yPos += 20;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Este es un documento estimado. El valor final se confirma luego de la reunión de cotización.', margen, yPos, { maxWidth: anchoUtil });

  // Descargar
  const nombreArchivo = `cotizacion-healthcanvas-${nombre.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(nombreArchivo);
}