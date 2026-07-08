// js/tienda.js
// ── ESTADO GLOBAL ───────────────────────────────────────────────────────────

let carrito = [];
let ivaActual = 0;
let descuentoPorcentaje = 0;
let descuentoAplicado = false;

// ── MODO LINK (tienda.html?linkId=XXX) ──────────────────────────────────────
let modoLink = false;
let linkData = null;

// ── MAPA DE INCLUIDOS POR PLAN ──────────────────────────────────────────────
const INCLUIDOS = {
  'Sitio Esencial Básico': [],
  'Sitio Esencial Pro': [
    'Formulario de contacto',
    'Animaciones de desplazamiento',
    'Sección de testimonios',
    'Diseño personalizado',
  ],
  'Sitio Profesional Básico': [
    'Formulario de contacto',
    'Animaciones de desplazamiento',
    'Sección de testimonios',
    'Diseño personalizado',
    'PDFs descargables',
  ],
  'Sitio Profesional Pro': [
    'Formulario de contacto',
    'Diseño personalizado',
    'Sección de especialidades detalladas',
    'PDFs descargables',
    'Agendamiento con Calendly',
    'Optimización para motores de búsqueda',
    'Buscador de palabras',
    'Animaciones de desplazamiento',
  ],
  'Sitio con Chatbot Básico': [
    'Formulario de contacto',
    'Animaciones de desplazamiento',
    'Sección de testimonios',
    'Diseño personalizado',
    'Sección de preguntas frecuentes',
    'Chatbot básico',
    'Sección de especialidades detalladas',
    'Agendamiento con Calendly',
    'PDFs descargables',
  ],
  'Sitio con Chatbot Pro': [
    'Formulario de contacto',
    'Diseño personalizado',
    'Sección de especialidades detalladas',
    'PDFs descargables',
    'Agendamiento con Calendly',
    'Optimización para motores de búsqueda',
    'Buscador de palabras',
    'Chatbot básico',
    'Chatbot con IA',
    'Asistente de agendamiento con IA',
    'Sección de preguntas frecuentes',
    'Animaciones de desplazamiento',
    'Sección de testimonios',
  ],
};

// ── MAPA DE DEPENDENCIAS ────────────────────────────────────────────────────
const REQUISITOS = {
  'Chatbot con IA': ['Chatbot básico'],
  'Asistente de agendamiento con IA': ['Agendamiento con Calendly', 'Chatbot básico', 'Chatbot con IA'],
};

// ── DOM ELEMENTS ─────────────────────────────────────────────────────────────

const nombreInput = document.getElementById('ti-nombre');
const emailInput = document.getElementById('ti-email');
const telefonoInput = document.getElementById('ti-telefono');
const itemsList = document.getElementById('itemsList');
const carritoVacio = document.getElementById('carritoVacio');
const carritoItems = document.getElementById('carritoItems');
const resumenVacio = document.getElementById('resumenVacio');
const resumenContenido = document.getElementById('resumenContenido');
const resumenLista = document.getElementById('resumenLista');
const subtotalValue = document.getElementById('subtotalValue');
const ivaValue = document.getElementById('ivaValue');
const descuentoValue = document.getElementById('descuentoValue');
const totalValue = document.getElementById('totalValue');
const descuentoLinea = document.getElementById('descuentoLinea');
const volverCotizador = document.getElementById('volverCotizador');
const limpiarCarrito = document.getElementById('limpiarCarrito');
const aplicarCodigo = document.getElementById('aplicarCodigo');
const codigoInput = document.getElementById('codigoInput');
const codigoMensaje = document.getElementById('codigoMensaje');
const exportarPDF = document.getElementById('exportarPDF');
const procesarPago = document.getElementById('procesarPago');

// ── FUNCIONES DE CARRITO ────────────────────────────────────────────────────

function tiManejarCambio(input) {
  const nombre = input.value;
  const precio = parseInt(input.dataset.precio);

  if (input.type === 'radio' && input.name === 'ti-plan') {
    // PLANES: radio buttons
    if (input.checked) {
      // Deseleccionar plan anterior y reemplazarlo
      carrito = carrito.filter(item => !Object.keys(INCLUIDOS).includes(item.nombre));
      carrito.push({ nombre, precio });
      
      // Eliminar automáticamente elementos sueltos que ahora están incluidos en el nuevo plan
      tiEliminarElementosIncluidos(nombre);
    } else {
      // Remover si se deselecciona
      carrito = carrito.filter(item => item.nombre !== nombre);
    }
  } else if (input.type === 'radio') {
    // TOGGLES (Logo, Post, Tarjeta): radio buttons mutuamente excluyentes
    if (input.checked) {
      // Remover el valor anterior del mismo grupo (si existe)
      carrito = carrito.filter(item => item.nombre !== tiObtenerValorPrevioDelGrupo(input.name));
      // Agregar el nuevo
      carrito.push({ nombre, precio });
    }
  } else if (input.type === 'checkbox') {
    // ELEMENTOS Y COMPLEMENTOS: checkboxes
    if (input.checked) {
      // Agregar si no existe
      if (!carrito.find(item => item.nombre === nombre)) {
        carrito.push({ nombre, precio });
      }
    } else {
      // Remover si se destilda
      carrito = carrito.filter(item => item.nombre !== nombre);
    }
  }

  guardarCarritoEnLocalStorage();
  actualizarUI();
  tiActualizarEstadoOpciones();
}

// Obtener el valor previo de un grupo de radio buttons (para reemplazar)
function tiObtenerValorPrevioDelGrupo(nombreGrupo) {
  const radios = document.querySelectorAll(`input[name="${nombreGrupo}"]`);
  for (const radio of radios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null;
}

// Eliminar automáticamente elementos sueltos que ahora están incluidos en el plan
function tiEliminarElementosIncluidos(planNombre) {
  const elementosIncluidos = INCLUIDOS[planNombre] || [];
  
  // Eliminar del carrito
  carrito = carrito.filter(item => !elementosIncluidos.includes(item.nombre));
  
  // Desmarcar los checkboxes y radio buttons correspondientes
  elementosIncluidos.forEach(elemento => {
    const input = document.querySelector(`input[value="${elemento}"]`);
    if (input) {
      input.checked = false;
    }
  });
}

function tiActualizarEstadoOpciones() {
  const planSeleccionado = document.querySelector('input[name="ti-plan"]:checked');
  const planValue = planSeleccionado ? planSeleccionado.value : null;
  const incluidos = planValue ? (INCLUIDOS[planValue] || []) : [];

  // ¿Este valor ya está disponible (incluido en el plan, o marcado y habilitado)?
  function estaDisponible(valor) {
    if (incluidos.includes(valor)) return true;
    const input = document.querySelector(`input[value="${valor}"]`);
    return input ? input.checked : false;
  }

  // Actualizar TODAS las opciones (elementos sueltos y complementos)
  document.querySelectorAll('.ti-toggles-cotizador .cotizador__opcion').forEach(card => {
    const input = card.querySelector('input');
    if (!input) return;

    const opcionCard = card.querySelector('.cotizador__opcion-card');
    
    // Limpiar estado visual previo
    const badgeViejo = opcionCard.querySelector('.badge-incluido, .badge-requisito, .ti-badge-incluido, .ti-badge-en-carrito');
    if (badgeViejo) badgeViejo.remove();
    card.classList.remove('is-incluido', 'is-bloqueado', 'ti-incluido', 'ti-en-carrito');

    const esIncluido = incluidos.includes(input.value);
    const requisitos = REQUISITOS[input.value] || [];
    const faltantes = requisitos.filter(req => !estaDisponible(req));

    if (esIncluido) {
      input.checked = false;
      input.disabled = true;
      card.classList.add('is-incluido');
      const badge = document.createElement('span');
      badge.className = 'badge-incluido';
      badge.textContent = '✓ Incluido en tu plan';
      opcionCard.appendChild(badge);
    } else if (faltantes.length > 0) {
      input.checked = false;
      input.disabled = true;
      card.classList.add('is-bloqueado');
      const badge = document.createElement('span');
      badge.className = 'badge-requisito';
      badge.textContent = `Agrega: ${faltantes.join(', ')}`;
      opcionCard.appendChild(badge);
    } else {
      input.disabled = false;
    }
  });
}

function guardarCarritoEnLocalStorage() {
  localStorage.setItem('healthcanvasCarrito', JSON.stringify(carrito));
  actualizarBadgeGlobal();
}

function cargarCarritoDesdeLocalStorage() {
  const saved = localStorage.getItem('healthcanvasCarrito');
  if (saved) {
    carrito = JSON.parse(saved);
  }
}

function guardarClienteEnLocalStorage() {
  const cliente = {
    nombre: nombreInput.value,
    email: emailInput.value,
    telefono: telefonoInput.value,
  };
  localStorage.setItem('healthcanvasCliente', JSON.stringify(cliente));
}

function cargarClienteDesdeLocalStorage() {
  const saved = localStorage.getItem('healthcanvasCliente');
  if (saved) {
    const cliente = JSON.parse(saved);
    nombreInput.value = cliente.nombre || '';
    emailInput.value = cliente.email || '';
    telefonoInput.value = cliente.telefono || '';
  }
}

function actualizarUI() {
  actualizarCarritoUI();
  actualizarResumenUI();
}

function actualizarCarritoUI() {
  itemsList.innerHTML = '';

  if (carrito.length === 0) {
    carritoVacio.style.display = 'block';
    carritoItems.style.display = 'none';
    return;
  }

  carritoVacio.style.display = 'none';
  carritoItems.style.display = 'block';

  carrito.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'ti-item';
    div.innerHTML = `
      <div class="ti-item__info">
        <div class="ti-item__nombre">${item.nombre}</div>
        <div class="ti-item__precio">$${item.precio.toLocaleString('es-CO')}</div>
      </div>
      <button class="ti-item__eliminar" onclick="tiEliminarDelCarrito(${index})" title="Eliminar">×</button>
    `;
    itemsList.appendChild(div);
  });
}

function tiEliminarDelCarrito(index) {
  const item = carrito[index];
  carrito.splice(index, 1);

  // Desmarcar el input correspondiente
  const input = document.querySelector(`input[value="${item.nombre}"]`);
  if (input) {
    input.checked = false;
  }

  guardarCarritoEnLocalStorage();
  actualizarUI();
  tiActualizarEstadoOpciones();
}

function actualizarResumenUI() {
  if (carrito.length === 0) {
    resumenVacio.style.display = 'block';
    resumenContenido.style.display = 'none';
    return;
  }

  resumenVacio.style.display = 'none';
  resumenContenido.style.display = 'block';

  // Resumen lista
  resumenLista.innerHTML = '';
  carrito.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.nombre}</span><span>$${item.precio.toLocaleString('es-CO')}</span>`;
    resumenLista.appendChild(li);
  });

  // Cálculos
  const subtotal = carrito.reduce((sum, item) => sum + item.precio, 0);
  const iva = Math.round(subtotal * (ivaActual / 100));
  const descuento = descuentoAplicado ? Math.round(subtotal * (descuentoPorcentaje / 100)) : 0;
  const total = subtotal + iva - descuento;

  subtotalValue.textContent = `$${subtotal.toLocaleString('es-CO')}`;
  ivaValue.textContent = `$${iva.toLocaleString('es-CO')}`;
  totalValue.textContent = `$${total.toLocaleString('es-CO')}`;

  if (descuentoAplicado && descuentoPorcentaje > 0) {
    descuentoLinea.style.display = 'flex';
    descuentoValue.textContent = `$${descuento.toLocaleString('es-CO')}`;
    document.getElementById('descuentoPorc').textContent = `(${descuentoPorcentaje}%)`;
  } else {
    descuentoLinea.style.display = 'none';
  }
}

function limpiarCarritoCompleto() {
  if (confirm('¿Estás seguro de que deseas limpiar todo tu carrito?')) {
    carrito = [];
    descuentoAplicado = false;
    descuentoPorcentaje = 0;
    codigoInput.value = '';
    
    // Desmarcar todos los inputs
    document.querySelectorAll('.ti-toggles-cotizador input').forEach(input => {
      input.checked = false;
    });

    guardarCarritoEnLocalStorage();
    actualizarUI();
    tiActualizarEstadoOpciones();
  }
}

function aplicarCodigoDescuento() {
  const codigo = codigoInput.value.trim().toUpperCase();
  const mensajeDiv = codigoMensaje;

  const CODIGOS = {
    'AMIGO2026': 20,
    'REFERRAL': 5,
    'PROMO2026': 10,
  };

  if (!codigo) {
    mensajeDiv.style.display = 'none';
    descuentoAplicado = false;
    descuentoPorcentaje = 0;
    actualizarResumenUI();
    return;
  }

  if (CODIGOS[codigo]) {
    descuentoPorcentaje = CODIGOS[codigo];
    descuentoAplicado = true;
    mensajeDiv.style.display = 'block';
    mensajeDiv.style.color = 'var(--verde)';
    mensajeDiv.textContent = `✓ Código aplicado: ${descuentoPorcentaje}% de descuento`;
    actualizarResumenUI();
  } else {
    descuentoAplicado = false;
    descuentoPorcentaje = 0;
    mensajeDiv.style.display = 'block';
    mensajeDiv.style.color = 'var(--rojo)';
    mensajeDiv.textContent = '✗ Código no válido';
    actualizarResumenUI();
  }
}

function generarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const nombre = nombreInput.value || 'Cliente';
  const email = emailInput.value || 'N/A';
  const telefono = telefonoInput.value || 'N/A';

  doc.setFontSize(16);
  doc.text('Cotización HealthCanvas', 10, 10);

  doc.setFontSize(10);
  doc.text(`Cliente: ${nombre}`, 10, 20);
  doc.text(`Email: ${email}`, 10, 26);
  doc.text(`Teléfono: ${telefono}`, 10, 32);

  let y = 42;
  doc.setFontSize(11);
  doc.text('Detalles:', 10, y);
  y += 8;

  // En modo link, los ítems vienen del link (carrito + extras); si no, del cotizador normal.
  const items = modoLink
    ? [
        ...(linkData.carrito || []).map(i => ({ nombre: i.nombre, precio: i.precio })),
        ...(linkData.extras || []).map(e => ({ nombre: e.descripcion || 'Adicional', precio: e.valor })),
      ]
    : carrito;

  items.forEach(item => {
    doc.setFontSize(10);
    doc.text(`${item.nombre}: $${item.precio.toLocaleString('es-CO')}`, 10, y);
    y += 6;
  });

  y += 4;

  // En modo link, los totales ya vienen calculados en el link (no se recalculan aquí).
  const t = modoLink ? (linkData.totales || { subtotal: 0, iva: 0, totalDescuento: 0, total: 0 }) : null;
  const subtotal = modoLink ? t.subtotal : carrito.reduce((sum, item) => sum + item.precio, 0);
  const iva = modoLink ? t.iva : Math.round(subtotal * (ivaActual / 100));
  const descuento = modoLink ? t.totalDescuento : (descuentoAplicado ? Math.round(subtotal * (descuentoPorcentaje / 100)) : 0);
  const total = modoLink ? t.total : subtotal + iva - descuento;

  doc.setFontSize(11);
  doc.text(`Subtotal: $${subtotal.toLocaleString('es-CO')}`, 10, y);
  y += 6;
  doc.text(`IVA: $${iva.toLocaleString('es-CO')}`, 10, y);
  y += 6;

  if (descuento > 0) {
    doc.text(`Descuento: -$${descuento.toLocaleString('es-CO')}`, 10, y);
    y += 6;
  }

  // Líneas de adelanto/saldo o ya-pagado/se-paga-ahora, igual que en pantalla.
  if (modoLink && linkData.tipo_pago === 'adelanto') {
    doc.text(`Adelanto: $${linkData.monto_a_pagar.toLocaleString('es-CO')}`, 10, y);
    y += 6;
    doc.text(`Saldo pendiente: $${(linkData.monto_pendiente || 0).toLocaleString('es-CO')}`, 10, y);
    y += 6;
  } else if (modoLink && linkData.tipo_pago === 'pago_final') {
    const yaPagado = total - linkData.monto_a_pagar;
    doc.text(`Ya pagado antes: $${yaPagado.toLocaleString('es-CO')}`, 10, y);
    y += 6;
    doc.text(`Se paga ahora: $${linkData.monto_a_pagar.toLocaleString('es-CO')}`, 10, y);
    y += 6;
  }

  doc.setFont(undefined, 'bold');
  const totalAPagar = modoLink ? linkData.monto_a_pagar : total;
  doc.text(`Total: $${totalAPagar.toLocaleString('es-CO')}`, 10, y);

  doc.save('cotizacion-healthcanvas.pdf');
}

function actualizarBadgeGlobal() {
  const badge = document.getElementById('carritoBadge');
  if (badge) {
    if (carrito.length > 0) {
      badge.textContent = carrito.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ── MODO LINK: consulta el link real en Supabase y pinta la tienda en modo solo-lectura ─────

async function inicializarModoLink(linkId) {
  let data;
  try {
    const r = await fetch(`/api/link-publico?linkId=${encodeURIComponent(linkId)}`);
    data = await r.json();
  } catch (error) {
    mostrarEstadoLink('No pudimos cargar este link. Intenta de nuevo o comunícate con nosotros.');
    return;
  }

  if (!data || data.estado_publico === 'no_encontrado') {
    mostrarEstadoLink('No encontramos este link, verifica que el enlace esté correcto o comunícate con nosotros.');
    return;
  }
  if (data.estado_publico === 'expirado') {
    mostrarEstadoLink('Este link ha caducado, si necesitas hacer un pago comunícate con nosotros para reactivarlo.');
    return;
  }
  if (data.estado_publico === 'anulado') {
    mostrarEstadoLink('Este link se ha anulado, si necesitas hacer un pago comunícate con nosotros para generarte un link nuevo.');
    return;
  }
  if (data.estado_publico === 'usado') {
    mostrarEstadoLink('Este link ya fue usado, si necesitas hacer un pago comunícate con nosotros para hacer tu cotización o generarte un link nuevo.');
    return;
  }

  // Link válido
  linkData = data;
  activarModoLinkUI();
  renderCarritoModoLink();
  renderResumenModoLink();

  // Prellenar los datos del cliente (siguen siendo editables por si hay algún error)
  nombreInput.value = linkData.cliente_nombre || '';
  emailInput.value = linkData.cliente_email || '';
  telefonoInput.value = linkData.cliente_telefono || '';
}

// Oculta el cotizador y todo el contenido, mostrando solo el mensaje de estado.
function mostrarEstadoLink(mensaje) {
  document.getElementById('cotizadorSection').style.display = 'none';
  document.getElementById('mainSection').style.display = 'none';
  document.getElementById('linkEstadoSection').style.display = 'block';
  document.getElementById('linkEstadoTexto').textContent = mensaje;
}

// Ajusta la interfaz a modo solo-lectura: sin cotizador, sin acciones de edición, sin código de descuento.
// El botón de exportar PDF SÍ se mantiene (el cliente puede querer compartirlo).
function activarModoLinkUI() {
  modoLink = true;
  document.getElementById('cotizadorSection').style.display = 'none';
  document.getElementById('carritoAvisoLink').style.display = 'block';
  document.getElementById('carritoAcciones').style.display = 'none';
  document.getElementById('codigoWrap').style.display = 'none';
}

// Pinta el carrito (planes/elementos + extras) sin botón de eliminar, todo de solo lectura.
function renderCarritoModoLink() {
  const items = [
    ...(linkData.carrito || []).map(i => ({ nombre: i.nombre, precio: i.precio })),
    ...(linkData.extras || []).map(e => ({ nombre: e.descripcion || 'Adicional', precio: e.valor })),
  ];

  itemsList.innerHTML = '';

  if (items.length === 0) {
    carritoVacio.style.display = 'block';
    carritoItems.style.display = 'none';
    return;
  }

  carritoVacio.style.display = 'none';
  carritoItems.style.display = 'block';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'ti-item';
    div.innerHTML = `
      <div class="ti-item__info">
        <div class="ti-item__nombre">${item.nombre}</div>
        <div class="ti-item__precio">$${item.precio.toLocaleString('es-CO')}</div>
      </div>
    `;
    itemsList.appendChild(div);
  });
}

// Pinta el resumen a partir de los totales YA guardados en el link (no se recalculan),
// más las líneas de adelanto/saldo o ya pagado antes/se paga ahora según tipo_pago.
function renderResumenModoLink() {
  const t = linkData.totales || { subtotal: 0, iva: 0, totalDescuento: 0, total: 0, desglose: [] };

  resumenVacio.style.display = 'none';
  resumenContenido.style.display = 'block';

  resumenLista.innerHTML = '';
  const items = [
    ...(linkData.carrito || []).map(i => ({ nombre: i.nombre, precio: i.precio })),
    ...(linkData.extras || []).map(e => ({ nombre: e.descripcion || 'Adicional', precio: e.valor })),
  ];
  items.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.nombre}</span><span>$${item.precio.toLocaleString('es-CO')}</span>`;
    resumenLista.appendChild(li);
  });

  subtotalValue.textContent = `$${t.subtotal.toLocaleString('es-CO')}`;
  ivaValue.textContent = `$${t.iva.toLocaleString('es-CO')}`;
  document.getElementById('ivaPorc').textContent = t.subtotal > 0 ? `(${Math.round((t.iva / t.subtotal) * 100)}%)` : '(0%)';

  if (t.totalDescuento > 0) {
    descuentoLinea.style.display = 'flex';
    descuentoValue.textContent = `$${t.totalDescuento.toLocaleString('es-CO')}`;
    document.getElementById('descuentoPorc').textContent = `(${Math.round((t.totalDescuento / t.subtotal) * 100)}%)`;
  } else {
    descuentoLinea.style.display = 'none';
  }

  // Líneas especiales (adelanto/saldo pendiente, o ya pagado antes/se paga ahora)
  let contenedor = document.getElementById('lineasEspecialesResumen');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'lineasEspecialesResumen';
    const totalDiv = document.querySelector('.ti-resumen__total');
    totalDiv.parentNode.insertBefore(contenedor, totalDiv);
  }
  contenedor.innerHTML = '';

  const pct = linkData.porcentaje_adelanto != null
    ? linkData.porcentaje_adelanto
    : (t.total > 0 ? Math.round((linkData.monto_a_pagar / t.total) * 100) : 0);

  if (linkData.tipo_pago === 'adelanto') {
    contenedor.innerHTML = `
      <div class="ti-resumen__linea"><span>Adelanto (${pct}%)</span><strong>$${linkData.monto_a_pagar.toLocaleString('es-CO')}</strong></div>
      <div class="ti-resumen__linea"><span>Saldo pendiente</span><strong>$${(linkData.monto_pendiente || 0).toLocaleString('es-CO')}</strong></div>
    `;
  } else if (linkData.tipo_pago === 'pago_final') {
    const yaPagado = t.total - linkData.monto_a_pagar;
    contenedor.innerHTML = `
      <div class="ti-resumen__linea"><span>Ya pagado antes</span><strong>$${yaPagado.toLocaleString('es-CO')}</strong></div>
      <div class="ti-resumen__linea"><span>Se paga ahora (${pct}%)</span><strong>$${linkData.monto_a_pagar.toLocaleString('es-CO')}</strong></div>
    `;
  }

  totalValue.textContent = `$${linkData.monto_a_pagar.toLocaleString('es-CO')}`;
}

// ── EVENT LISTENERS PARA TOGGLES ────────────────────────────────────────────

function inicializarTogglesTienda() {
  // Toggle Logo
  const logoHeaderTienda = document.getElementById('logoHeaderTienda');
  if (logoHeaderTienda) {
    logoHeaderTienda.addEventListener('click', () => {
      const opciones = document.getElementById('logoOpcionesTienda');
      const abierto = opciones.style.display === 'flex';
      opciones.style.display = abierto ? 'none' : 'flex';
      logoHeaderTienda.classList.toggle('is-open', !abierto);
    });
  }

  // Toggle Post
  const postHeaderTienda = document.getElementById('postHeaderTienda');
  if (postHeaderTienda) {
    postHeaderTienda.addEventListener('click', () => {
      const opciones = document.getElementById('postOpcionesTienda');
      const abierto = opciones.style.display === 'flex';
      opciones.style.display = abierto ? 'none' : 'flex';
      postHeaderTienda.classList.toggle('is-open', !abierto);
    });
  }

  // Toggle Tarjeta
  const tarjetaHeaderTienda = document.getElementById('tarjetaHeaderTienda');
  if (tarjetaHeaderTienda) {
    tarjetaHeaderTienda.addEventListener('click', () => {
      const opciones = document.getElementById('tarjetaOpcionesTienda');
      const abierto = opciones.style.display === 'flex';
      opciones.style.display = abierto ? 'none' : 'flex';
      tarjetaHeaderTienda.classList.toggle('is-open', !abierto);
    });
  }
}

// ── EVENT LISTENERS ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  actualizarBadgeGlobal();
  inicializarTogglesTienda();

  const params = new URLSearchParams(window.location.search);
  const linkId = params.get('linkId');

  if (linkId) {
    inicializarModoLink(linkId);
  } else {
    cargarCarritoDesdeLocalStorage();
    cargarClienteDesdeLocalStorage();
    actualizarUI();
    tiActualizarEstadoOpciones();
  }

  // Event listeners
  aplicarCodigo.addEventListener('click', aplicarCodigoDescuento);
  volverCotizador.addEventListener('click', () => {
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

// Sincronizar carrito entre pestañas
window.addEventListener('storage', (e) => {
  if (modoLink) return;
  if (e.key === 'healthcanvasCarrito') {
    cargarCarritoDesdeLocalStorage();
    actualizarUI();
    actualizarBadgeGlobal();
    tiActualizarEstadoOpciones();
  }
});