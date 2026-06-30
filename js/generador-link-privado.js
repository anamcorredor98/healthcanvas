// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE LINKS PRIVADOS - JavaScript v2 + FIX #2 (Dependencias)
// Solo: Precios siempre visibles + badge pequeño de "Incluido"
// ════════════════════════════════════════════════════════════════════════════

const CREDENCIALES = { usuario: 'ana-admin', contraseña: 'K9m#Xp2@Lw4$Nq7' };

const INCLUIDOS = {
  'Sitio Esencial Básico': [],
  'Sitio Esencial Pro': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección de testimonios', 'Diseño personalizado'],
  'Sitio Profesional Básico': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección de testimonios', 'Diseño personalizado', 'PDFs descargables'],
  'Sitio Profesional Pro': ['Formulario de contacto', 'Diseño personalizado', 'Sección de especialidades detalladas', 'PDFs descargables', 'Agendamiento con Calendly', 'Optimización para motores de búsqueda', 'Buscador de palabras', 'Animaciones de desplazamiento'],
  'Sitio con Chatbot Básico': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección de testimonios', 'Diseño personalizado', 'Sección de especialidades detalladas', 'Agendamiento con Calendly', 'PDFs descargables', 'Sección de preguntas frecuentes', 'Chatbot básico'],
  'Sitio con Chatbot Pro': ['Formulario de contacto', 'Diseño personalizado', 'Sección de especialidades detalladas', 'PDFs descargables', 'Agendamiento con Calendly', 'Optimización para motores de búsqueda', 'Buscador de palabras', 'Chatbot básico', 'Chatbot con IA', 'Asistente de agendamiento con IA', 'Sección de preguntas frecuentes', 'Animaciones de desplazamiento', 'Sección de testimonios']
};

const REQUISITOS = {
  'Chatbot con IA': ['Chatbot básico'],
  'Asistente de agendamiento con IA': ['Chatbot básico', 'Chatbot con IA', 'Agendamiento con Calendly']
};

let carrito = [];
let extras = [];
const ivaActual = 0; // Ana no es responsable de IVA aún

// ════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

function glpManejarLogin(event) {
  event.preventDefault();
  const usuario = document.getElementById('glp-usuario').value;
  const contraseña = document.getElementById('glp-contraseña').value;
  const errorDiv = document.getElementById('glp-error-login');

  if (usuario === CREDENCIALES.usuario && contraseña === CREDENCIALES.contraseña) {
    localStorage.setItem('glp-autenticado', 'true');
    document.getElementById('glp-modal-auth').style.display = 'none';
    document.getElementById('glp-contenido').style.display = 'block';
  } else {
    errorDiv.textContent = 'Usuario o contraseña incorrectos';
    errorDiv.style.display = 'block';
    document.getElementById('glp-contraseña').value = '';
  }
}

function glpCerrarSesion() {
  if (confirm('¿Estás seguro?')) {
    localStorage.removeItem('glp-autenticado');
    location.reload();
  }
}

function glpVerificarAutenticacion() {
  if (localStorage.getItem('glp-autenticado') === 'true') {
    document.getElementById('glp-modal-auth').style.display = 'none';
    document.getElementById('glp-contenido').style.display = 'block';
  } else {
    document.getElementById('glp-modal-auth').style.display = 'flex';
    document.getElementById('glp-contenido').style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Verificar si un valor está disponible
// ════════════════════════════════════════════════════════════════════════════

function glpEstaDisponible(valor) {
  const planActual = carrito.find(c => Object.keys(INCLUIDOS).includes(c.nombre));
  const planName = planActual?.nombre;
  const incluidos = planName ? (INCLUIDOS[planName] || []) : [];
  
  // ¿Está incluido en el plan actual?
  if (incluidos.includes(valor)) return true;
  
  // ¿Está marcado en el carrito?
  return carrito.some(c => c.nombre === valor);
}

// ════════════════════════════════════════════════════════════════════════════
// COTIZADOR
// ════════════════════════════════════════════════════════════════════════════

function glpManejarCambio(input) {
  const nombre = input.value;
  const precio = parseInt(input.dataset.precio) || 0;

  if (input.type === 'radio' && input.name === 'glp-plan') {
    if (input.checked) {
      carrito = carrito.filter(item => !Object.keys(INCLUIDOS).includes(item.nombre));
      carrito.unshift({ nombre, precio, tipo: 'plan' });
      glpEliminarElementosIncluidos();
    }
  } else if (input.type === 'radio' && (input.name === 'glp-logo' || input.name === 'glp-post' || input.name === 'glp-tarjeta')) {
    const oldIndex = carrito.findIndex(item => 
      (input.name === 'glp-logo' && item.nombre.includes('Logo')) ||
      (input.name === 'glp-post' && item.nombre.includes('Post')) ||
      (input.name === 'glp-tarjeta' && item.nombre.includes('Tarjeta'))
    );
    if (oldIndex >= 0) carrito.splice(oldIndex, 1);
    if (input.checked) {
      const tipo = input.dataset.tipo === 'cotizacion' ? 'cotizacion' : 'normal';
      carrito.push({ nombre, precio, tipo });
    }
  } else if (input.type === 'checkbox') {
    if (input.checked) {
      carrito.push({ nombre, precio, tipo: 'normal' });
    } else {
      carrito = carrito.filter(item => item.nombre !== nombre);
    }
  }

  glpGuardarCarrito();
  glpActualizarEstadoOpciones();
  glpActualizarPreview();
}

function glpEliminarElementosIncluidos() {
  const planActual = carrito[0]?.nombre;
  if (!planActual || !INCLUIDOS[planActual]) return;

  const incluidos = INCLUIDOS[planActual];
  const itemsAEliminar = [];

  carrito.forEach((item, idx) => {
    if (incluidos.includes(item.nombre)) {
      const input = document.querySelector(`input[value="${item.nombre}"]`);
      if (input) input.checked = false;
      itemsAEliminar.push(idx);
    }
  });

  carrito = carrito.filter((_, idx) => !itemsAEliminar.includes(idx));
}

// ════════════════════════════════════════════════════════════════════════════
// ACTUALIZAR ESTADO DE OPCIONES (con bloqueos y badges dinámicos)
// ════════════════════════════════════════════════════════════════════════════

function glpActualizarEstadoOpciones() {
  const planSeleccionado = document.querySelector('input[name="glp-plan"]:checked');
  const planValue = planSeleccionado ? planSeleccionado.value : null;
  const incluidos = planValue ? (INCLUIDOS[planValue] || []) : [];

  // Iterar sobre TODOS los checkboxes de elementos sueltos
  document.querySelectorAll('input[type="checkbox"]').forEach(input => {
    // Saltar checkboxes de descuentos y otros
    if (['glp-desc-porc-activo', 'glp-desc-valor-activo', 'glp-desc-codigo-activo'].includes(input.id)) {
      return;
    }

    // Saltar si no tiene estructura de card (elementos sueltos)
    const label = input.closest('.cotizador__opcion');
    if (!label) return;
    
    const opcionCard = label.querySelector('.cotizador__opcion-card');
    if (!opcionCard) return;

    // Limpiar badges previos
    const badgeViejo = opcionCard.querySelector('.glp-badge-incluido, .glp-badge-requisito');
    if (badgeViejo) badgeViejo.remove();
    label.classList.remove('is-incluido', 'is-bloqueado');

    const valor = input.value;
    const esIncluido = incluidos.includes(valor);
    const requisitos = REQUISITOS[valor] || [];
    
    // Calcular faltantes usando la función helper
    const faltantes = requisitos.filter(req => !glpEstaDisponible(req));

    if (esIncluido) {
      // INCLUIDO: deshabilitado, opaco, badge verde
      input.checked = false;
      input.disabled = true;
      label.classList.add('is-incluido');
      const badge = document.createElement('small');
      badge.className = 'glp-badge-incluido';
      badge.textContent = '✓ Incluido en tu plan';
      badge.style.display = 'block';
      badge.style.marginTop = '6px';
      badge.style.fontSize = '11px';
      badge.style.color = '#27a745';
      opcionCard.appendChild(badge);
    } else if (faltantes.length > 0) {
      // BLOQUEADO: deshabilitado, muestra faltantes
      input.checked = false;
      input.disabled = true;
      label.classList.add('is-bloqueado');
      const badge = document.createElement('small');
      badge.className = 'glp-badge-requisito';
      badge.textContent = `Agrega: ${faltantes.join(', ')}`;
      badge.style.display = 'block';
      badge.style.marginTop = '6px';
      badge.style.fontSize = '11px';
      badge.style.color = '#666';
      opcionCard.appendChild(badge);
    } else {
      // DISPONIBLE: habilitado, sin bloqueos
      input.disabled = false;
      label.classList.remove('is-bloqueado');
    }
  });
}

function glpGuardarCarrito() {
  localStorage.setItem('glp-carrito-temporal', JSON.stringify(carrito));
}

function glpToggleDescuento(tipo) {
  const activo = document.getElementById(`glp-desc-${tipo}-activo`).checked;
  document.getElementById(`glp-desc-${tipo}-opciones`).style.display = activo ? 'block' : 'none';
  glpActualizarPreview();
}

function glpAgregarExtra() {
  const id = Date.now();
  extras.push({ id, descripcion: '', valor: 0 });
  glpActualizarExtras();
}

function glpEliminarExtra(id) {
  extras = extras.filter(e => e.id !== id);
  glpActualizarExtras();
  glpActualizarPreview();
}

function glpActualizarExtras() {
  const lista = document.getElementById('glp-extras-lista');
  lista.innerHTML = extras.map(extra => `
    <div class="glp-extra-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #d3d1c7; border-radius: 8px;">
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input type="text" placeholder="Ej: Actualización, Consultoría..." value="${extra.descripcion}" 
               onchange="glpActualizarExtraDescripcion(${extra.id}, this.value)" 
               style="flex: 1; padding: 8px; border: 1px solid #d3d1c7; border-radius: 4px;">
        <input type="number" placeholder="Valor" value="${extra.valor}" 
               onchange="glpActualizarExtraValor(${extra.id}, parseInt(this.value) || 0)" 
               style="width: 150px; padding: 8px; border: 1px solid #d3d1c7; border-radius: 4px;">
        <button onclick="glpEliminarExtra(${extra.id})" style="background: #e24b4a; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">✕</button>
      </div>
    </div>
  `).join('');
}

function glpActualizarExtraDescripcion(id, valor) {
  const extra = extras.find(e => e.id === id);
  if (extra) extra.descripcion = valor;
  glpActualizarPreview();
}

function glpActualizarExtraValor(id, valor) {
  const extra = extras.find(e => e.id === id);
  if (extra) extra.valor = valor;
  glpActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// PREVISUALIZACIÓN Y CÁLCULOS
// ════════════════════════════════════════════════════════════════════════════

function glpActualizarPreview() {
  // Actualizar verificar datos
  document.getElementById('glp-verify-nombre').value = document.getElementById('glp-nombre').value;
  document.getElementById('glp-verify-email').value = document.getElementById('glp-email').value;
  document.getElementById('glp-verify-telefono').value = document.getElementById('glp-telefono').value;

  if (carrito.length === 0 && extras.length === 0) {
    document.getElementById('glp-carrito-vacio').style.display = 'block';
    document.getElementById('glp-carrito-items').style.display = 'none';
    document.getElementById('glp-resumen-vacio').style.display = 'block';
    document.getElementById('glp-resumen-contenido').style.display = 'none';
    return;
  }

  // CARRITO VISUAL
  document.getElementById('glp-carrito-vacio').style.display = 'none';
  document.getElementById('glp-carrito-items').style.display = 'block';

  const itemsHtml = [
    ...carrito.map((item, idx) => {
      const displayNombre = item.nombre;
const displayPrecio = item.tipo === 'cotizacion' ? 'Cotización directa' : `$${item.precio.toLocaleString('es-CO')}`;
      return `
        <div class="ti-carrito__item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d3d1c7;">
          <div>
            <div style="font-weight: 500;">${displayNombre}</div>
            ${displayPrecio ? `<div style="color: #185fa5; font-weight: 600;">${displayPrecio}</div>` : ''}
          </div>
          <button onclick="glpEliminarDelCarrito(${idx})" style="background: none; border: none; color: #e24b4a; font-size: 18px; cursor: pointer;">✕</button>
        </div>
      `;
    }),
    ...extras.map((extra, idx) => `
      <div class="ti-carrito__item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #d3d1c7;">
        <div>
          <div style="font-weight: 500;">${extra.descripcion || 'Extra sin descripción'}</div>
          <div style="color: #185fa5; font-weight: 600;">$${extra.valor.toLocaleString('es-CO')}</div>
        </div>
        <button onclick="glpEliminarExtra(${extra.id})" style="background: none; border: none; color: #e24b4a; font-size: 18px; cursor: pointer;">✕</button>
      </div>
    `)
  ].join('');

  document.getElementById('glp-items-lista').innerHTML = itemsHtml;

  // CÁLCULOS
  const subtotalPlan = carrito.filter(c => c.tipo === 'plan').reduce((sum, c) => sum + c.precio, 0);
  const subtotalElementos = carrito.filter(c => c.tipo === 'normal' && !Object.keys(INCLUIDOS).includes(c.nombre)).reduce((sum, c) => sum + c.precio, 0);
  const subtotalComplementos = carrito.filter(c => c.tipo === 'normal').reduce((sum, c) => sum + c.precio, 0) - subtotalElementos;
  const subtotalExtras = extras.reduce((sum, e) => sum + e.valor, 0);
  const subtotalTotal = subtotalPlan + subtotalElementos + subtotalComplementos + subtotalExtras;

  const iva = Math.round(subtotalTotal * (ivaActual / 100));

  // DESCUENTOS
  let descuentos = [];
  const acumula = document.querySelector('input[name="glp-acumula"]:checked')?.value === 'si';

  if (document.getElementById('glp-desc-porc-activo').checked) {
    const valor = parseInt(document.getElementById('glp-desc-porc-valor').value) || 0;
    const aplica = document.getElementById('glp-desc-porc-aplica').value;
    if (valor > 0) descuentos.push({ nombre: `Descuento especial ${valor}%`, tipo: 'porcentaje', valor, aplica });
  }

  if (document.getElementById('glp-desc-valor-activo').checked) {
    const valor = parseInt(document.getElementById('glp-desc-valor-monto').value) || 0;
    const aplica = document.getElementById('glp-desc-valor-aplica').value;
    if (valor > 0) descuentos.push({ nombre: `Descuento especial $${valor.toLocaleString('es-CO')}`, tipo: 'valor', valor, aplica });
  }

  if (document.getElementById('glp-desc-codigo-activo').checked) {
    const codigo = document.getElementById('glp-desc-codigo').value;
    const tipo = document.getElementById('glp-desc-codigo-tipo').value;
    const valor = parseInt(document.getElementById('glp-desc-codigo-valor').value) || 0;
    const aplica = document.getElementById('glp-desc-codigo-aplica').value;
    if (valor > 0 && codigo) descuentos.push({ nombre: `Código ${codigo}`, tipo, valor, aplica });
  }

  // Si no acumula, solo usa el primero
  if (!acumula && descuentos.length > 1) {
    descuentos = [descuentos[0]];
  }

  let totalDescuento = 0;
  let resumenDescuentos = [];

  descuentos.forEach(desc => {
    let base = 0;
    if (desc.aplica === 'todo') base = subtotalTotal;
    else if (desc.aplica === 'plan') base = subtotalPlan;
    else if (desc.aplica === 'elementos') base = subtotalElementos;
    else if (desc.aplica === 'complementos') base = subtotalComplementos;
    else if (desc.aplica === 'extras') base = subtotalExtras;

    let descMoneda = 0;
    if (desc.tipo === 'porcentaje') {
      descMoneda = Math.round(base * (desc.valor / 100));
    } else {
      descMoneda = desc.valor;
    }

    totalDescuento += descMoneda;
    const aplicaTexto = desc.aplica === 'todo' ? 'a toda la compra' : `a ${desc.aplica}`;
    resumenDescuentos.push(`<div class="ti-resumen__linea"><span>${desc.nombre} (${aplicaTexto})</span><strong>-$${descMoneda.toLocaleString('es-CO')}</strong></div>`);
  });

  const total = subtotalTotal + iva - totalDescuento;

  // ACTUALIZAR RESUMEN
  document.getElementById('glp-resumen-vacio').style.display = 'none';
  document.getElementById('glp-resumen-contenido').style.display = 'block';

  const resumenHtml = [
    ...carrito.map(item => {
      const displayNombre = item.nombre;
      const displayPrecio = item.tipo === 'cotizacion' ? 'Cotización directa' : `$${item.precio.toLocaleString('es-CO')}`;
      return `<li><span>${displayNombre}</span><span>${displayPrecio}</span></li>`;
    }),
    ...extras.map(e => `<li><span>${e.descripcion || 'Extra'}</span><span>$${e.valor.toLocaleString('es-CO')}</span></li>`)
  ].join('');

  document.getElementById('glp-resumen-lista').innerHTML = resumenHtml;
  document.getElementById('glp-subtotal').textContent = `$${subtotalTotal.toLocaleString('es-CO')}`;
  document.getElementById('glp-iva-porc').textContent = `(${ivaActual}%)`;
  document.getElementById('glp-iva').textContent = `$${iva.toLocaleString('es-CO')}`;
  document.getElementById('glp-resumen-descuentos').innerHTML = resumenDescuentos.join('');
  document.getElementById('glp-total').textContent = `$${total.toLocaleString('es-CO')}`;
}

function glpEliminarDelCarrito(idx) {
  const itemEliminado = carrito[idx];
  carrito.splice(idx, 1);
  
  // Desmarcar el input correspondiente
  const input = document.querySelector(`input[value="${itemEliminado.nombre}"]`);
  if (input) input.checked = false;
  
  glpGuardarCarrito();
  glpActualizarEstadoOpciones();
  glpActualizarPreview();
}

function glpLimpiarCarrito() {
  carrito = [];
  extras = [];
  document.getElementById('glp-nombre').value = '';
  document.getElementById('glp-email').value = '';
  document.getElementById('glp-telefono').value = '';
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
    if (!input.id.includes('desc') && !input.name.includes('acumula')) {
      input.checked = false;
    }
  });
  document.getElementById('glp-desc-porc-activo').checked = false;
  document.getElementById('glp-desc-valor-activo').checked = false;
  document.getElementById('glp-desc-codigo-activo').checked = false;
  document.getElementById('glp-desc-porc-opciones').style.display = 'none';
  document.getElementById('glp-desc-valor-opciones').style.display = 'none';
  document.getElementById('glp-desc-codigo-opciones').style.display = 'none';
  glpActualizarExtras();
  glpGuardarCarrito();
  glpActualizarEstadoOpciones();
  glpActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// GENERACIÓN DE LINK
// ════════════════════════════════════════════════════════════════════════════

function glpGenerarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function glpGenerarLink() {
  if (carrito.length === 0 && extras.length === 0) {
    alert('Selecciona al menos un plan o elemento');
    return;
  }

  const nombre = document.getElementById('glp-nombre').value.trim();
  const email = document.getElementById('glp-email').value.trim();
  const telefono = document.getElementById('glp-telefono').value.trim();

  if (!nombre || !email || !telefono) {
    alert('Completa todos los datos del cliente');
    return;
  }

  const linkId = glpGenerarUUID();
  const ahora = new Date();
  const expiracion = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  const linkObject = {
    linkId,
    cliente: { nombre, email, telefono },
    carrito: JSON.parse(JSON.stringify(carrito)),
    extras: JSON.parse(JSON.stringify(extras)),
    estado: 'válido',
    fechaCreacion: ahora.toISOString(),
    fechaExpiracion: expiracion.toISOString(),
    vistosCount: 0
  };

  let links = JSON.parse(localStorage.getItem('healthcanvasLinks') || '[]');
  links.unshift(linkObject);
  localStorage.setItem('healthcanvasLinks', JSON.stringify(links));

  const baseUrl = window.location.origin + window.location.pathname.replace('generador-link-privado.html', '');
  const linkUrl = `${baseUrl}tienda.html?linkId=${linkId}`;

  alert('✓ Link generado exitosamente!\n\nLink: ' + linkUrl + '\n\nVálido por 24 horas');
  glpLimpiarCarrito();
}

// ════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  glpVerificarAutenticacion();
  glpActualizarExtras();
  glpActualizarEstadoOpciones();
});