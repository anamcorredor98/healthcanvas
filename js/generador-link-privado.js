// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE LINKS PRIVADOS - JavaScript v2 + FIX #2 (Dependencias)
// Solo: Precios siempre visibles + badge pequeño de "Incluido"
// ════════════════════════════════════════════════════════════════════════════

const CREDENCIALES = { usuario: 'ana-admin', contrasenas: ['K9m#Xp2@Lw4$Nq7', 'T6v!Hs8&Yj1$Rd5'] };

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

  if (usuario === CREDENCIALES.usuario && CREDENCIALES.contrasenas.includes(contraseña)) {
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
      // INCLUIDO: deshabilitado, opaco, badge gris (estilo en el CSS)
      input.checked = false;
      input.disabled = true;
      label.classList.add('is-incluido');
      const badge = document.createElement('small');
      badge.className = 'glp-badge-incluido';
      badge.textContent = '✓ Incluido en tu plan';
      opcionCard.appendChild(badge);
    } else if (faltantes.length > 0) {
      // BLOQUEADO: deshabilitado, muestra faltantes (estilo en el CSS)
      input.checked = false;
      input.disabled = true;
      label.classList.add('is-bloqueado');
      const badge = document.createElement('small');
      badge.className = 'glp-badge-requisito';
      badge.textContent = `Agrega: ${faltantes.join(', ')}`;
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
    <div class="glp-extra-item">
      <div class="glp-extra-row">
        <input type="text" class="glp-extra-input-desc" placeholder="Ej: Actualización, Consultoría..." value="${extra.descripcion}"
               onchange="glpActualizarExtraDescripcion(${extra.id}, this.value)">
        <input type="number" class="glp-extra-input-valor" placeholder="Valor" value="${extra.valor}"
               onchange="glpActualizarExtraValor(${extra.id}, parseInt(this.value) || 0)">
        <button class="glp-extra-eliminar" onclick="glpEliminarExtra(${extra.id})">✕</button>
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

function glpCambiarTipoPago() {
  const tipo = document.querySelector('input[name="glp-tipo-pago"]:checked').value;
  const wrap = document.getElementById('glp-porcentaje-wrap');
  wrap.style.display = tipo === 'total' ? 'none' : 'block';
  if (tipo !== 'total' && glpTipoPagoAnterior === 'total') {
    document.getElementById('glp-porcentaje').value = 50;
  }
  glpTipoPagoAnterior = tipo;
  glpActualizarPreview();
}
let glpTipoPagoAnterior = 'total';

// ════════════════════════════════════════════════════════════════════════════
// PREVISUALIZACIÓN Y CÁLCULOS
// ════════════════════════════════════════════════════════════════════════════

function glpActualizarPreview() {
  const glpResPrev = document.getElementById('glp-resultado');
  if (glpResPrev) glpResPrev.style.display = 'none';
  // Actualizar verificar datos
  document.getElementById('glp-verify-nombre').value = document.getElementById('glp-nombre').value;
  document.getElementById('glp-verify-email').value = document.getElementById('glp-email').value;
  document.getElementById('glp-verify-telefono').value = document.getElementById('glp-telefono').value;

  if (carrito.length === 0 && extras.length === 0) {
    document.getElementById('glp-carrito-vacio').style.display = 'block';
    document.getElementById('glp-carrito-items').style.display = 'none';
    document.getElementById('glp-resumen-vacio').style.display = 'block';
    document.getElementById('glp-resumen-contenido').style.display = 'none';
    document.getElementById('glp-pago-detalle').innerHTML = '';
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
        <div class="ti-carrito__item glp-cart-item">
          <div>
            <div class="glp-cart-item__nombre">${displayNombre}</div>
            ${displayPrecio ? `<div class="glp-cart-item__precio">${displayPrecio}</div>` : ''}
          </div>
          <button class="glp-cart-item__eliminar" onclick="glpEliminarDelCarrito(${idx})">✕</button>
        </div>
      `;
    }),
    ...extras.map((extra, idx) => `
      <div class="ti-carrito__item glp-cart-item">
        <div>
          <div class="glp-cart-item__nombre">${extra.descripcion || 'Extra sin descripción'}</div>
          <div class="glp-cart-item__precio">$${extra.valor.toLocaleString('es-CO')}</div>
        </div>
        <button class="glp-cart-item__eliminar" onclick="glpEliminarExtra(${extra.id})">✕</button>
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
    const aplica = glpAplicaSeleccionado('porc');
    if (valor > 0) descuentos.push({ nombre: `Descuento especial ${valor}%`, tipo: 'porcentaje', valor, aplica });
  }

  if (document.getElementById('glp-desc-valor-activo').checked) {
    const valor = parseInt(document.getElementById('glp-desc-valor-monto').value) || 0;
    const aplica = glpAplicaSeleccionado('valor');
    if (valor > 0) descuentos.push({ nombre: `Descuento especial $${valor.toLocaleString('es-CO')}`, tipo: 'valor', valor, aplica });
  }

  if (document.getElementById('glp-desc-codigo-activo').checked) {
    const codigo = document.getElementById('glp-desc-codigo').value;
    const tipo = document.getElementById('glp-desc-codigo-tipo').value;
    const valor = parseInt(document.getElementById('glp-desc-codigo-valor').value) || 0;
    const aplica = glpAplicaSeleccionado('codigo');
    if (valor > 0 && codigo) descuentos.push({ nombre: `Código ${codigo}`, tipo, valor, aplica });
  }

  // Si no acumula, solo usa el primero
  if (!acumula && descuentos.length > 1) {
    descuentos = [descuentos[0]];
  }

  let totalDescuento = 0;
  let resumenDescuentos = [];
  const subs = { todo: subtotalTotal, plan: subtotalPlan, elementos: subtotalElementos, complementos: subtotalComplementos, extras: subtotalExtras };

  descuentos.forEach(desc => {
    const base = glpBaseDescuento(desc.aplica, subs);
    let descMoneda = desc.tipo === 'porcentaje' ? Math.round(base * (desc.valor / 100)) : Math.min(desc.valor, base);
    if (base <= 0 || descMoneda <= 0) return;
    totalDescuento += descMoneda;
    resumenDescuentos.push(`<div class="ti-resumen__linea"><span>${desc.nombre} (${glpAplicaTexto(desc.aplica)})</span><strong>-$${descMoneda.toLocaleString('es-CO')}</strong></div>`);
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

  const tipoPago = document.querySelector('input[name="glp-tipo-pago"]:checked')?.value || 'total';
  const detalleEl = document.getElementById('glp-pago-detalle');
  const porcentaje = parseInt(document.getElementById('glp-porcentaje').value) || 0;

  if (tipoPago === 'adelanto') {
    const montoAdelanto = Math.round(total * (porcentaje / 100));
    const restante = total - montoAdelanto;
    detalleEl.innerHTML = `
      <div class="ti-resumen__linea"><span>Adelanto (${porcentaje}%)</span><strong>$${montoAdelanto.toLocaleString('es-CO')}</strong></div>
      <div class="ti-resumen__linea"><span>Queda pendiente</span><strong>$${restante.toLocaleString('es-CO')}</strong></div>
    `;
  } else if (tipoPago === 'pago_final') {
    const montoAhora = Math.round(total * (porcentaje / 100));
    const yaPagado = total - montoAhora;
    detalleEl.innerHTML = `
      <div class="ti-resumen__linea"><span>Ya pagado antes</span><strong>$${yaPagado.toLocaleString('es-CO')}</strong></div>
      <div class="ti-resumen__linea"><span>Se paga ahora (${porcentaje}%)</span><strong>$${montoAhora.toLocaleString('es-CO')}</strong></div>
    `;
  } else {
    detalleEl.innerHTML = '';
  }
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

// Devuelve las categorías marcadas (array) para un descuento: 'porc' | 'valor' | 'codigo'.
function glpAplicaSeleccionado(tipo) {
  return Array.from(document.querySelectorAll('.glp-desc-' + tipo + '-aplica-multi:checked')).map(c => c.value);
}

// Suma el subtotal de las categorías marcadas.
function glpBaseDescuento(aplica, subs) {
  return aplica.reduce((s, cat) => s + (subs[cat] || 0), 0);
}

// Texto para el desglose: "a toda la compra" si están las cuatro, si no la lista.
function glpAplicaTexto(aplica) {
  if (aplica.includes('todo')) return 'a toda la compra';
  const todas = ['plan', 'elementos', 'complementos', 'extras'];
  if (todas.every(c => aplica.includes(c))) return 'a toda la compra';
  return 'a ' + aplica.join(', ');
}

// Calcula subtotal, IVA, descuentos y total a partir del estado actual.
function glpCalcularTotales() {
  const subtotalPlan = carrito.filter(c => c.tipo === 'plan').reduce((s, c) => s + c.precio, 0);
  const subtotalElementos = carrito.filter(c => c.tipo === 'normal' && !Object.keys(INCLUIDOS).includes(c.nombre)).reduce((s, c) => s + c.precio, 0);
  const subtotalComplementos = carrito.filter(c => c.tipo === 'normal').reduce((s, c) => s + c.precio, 0) - subtotalElementos;
  const subtotalExtras = extras.reduce((s, e) => s + e.valor, 0);
  const subtotal = subtotalPlan + subtotalElementos + subtotalComplementos + subtotalExtras;
  const iva = Math.round(subtotal * (ivaActual / 100));

  let descuentos = [];
  const acumula = document.querySelector('input[name="glp-acumula"]:checked')?.value === 'si';

  if (document.getElementById('glp-desc-porc-activo').checked) {
    const valor = parseInt(document.getElementById('glp-desc-porc-valor').value) || 0;
    const aplica = glpAplicaSeleccionado('porc');
    if (valor > 0) descuentos.push({ nombre: `Descuento especial ${valor}%`, tipo: 'porcentaje', valor, aplica });
  }
  if (document.getElementById('glp-desc-valor-activo').checked) {
    const valor = parseInt(document.getElementById('glp-desc-valor-monto').value) || 0;
    const aplica = glpAplicaSeleccionado('valor');
    if (valor > 0) descuentos.push({ nombre: `Descuento especial $${valor.toLocaleString('es-CO')}`, tipo: 'valor', valor, aplica });
  }
  if (document.getElementById('glp-desc-codigo-activo').checked) {
    const codigo = document.getElementById('glp-desc-codigo').value;
    const tipo = document.getElementById('glp-desc-codigo-tipo').value;
    const valor = parseInt(document.getElementById('glp-desc-codigo-valor').value) || 0;
    const aplica = glpAplicaSeleccionado('codigo');
    if (valor > 0 && codigo) descuentos.push({ nombre: `Código ${codigo}`, tipo, valor, aplica });
  }

  if (!acumula && descuentos.length > 1) descuentos = [descuentos[0]];

  const subs = { todo: subtotal, plan: subtotalPlan, elementos: subtotalElementos, complementos: subtotalComplementos, extras: subtotalExtras };

  let totalDescuento = 0;
  const desglose = [];
  descuentos.forEach(desc => {
    const base = glpBaseDescuento(desc.aplica, subs);
    let monto = desc.tipo === 'porcentaje' ? Math.round(base * (desc.valor / 100)) : Math.min(desc.valor, base);
    if (base <= 0 || monto <= 0) return;
    totalDescuento += monto;
    desglose.push({ nombre: desc.nombre, aplicaTexto: glpAplicaTexto(desc.aplica), monto });
  });

  const total = subtotal + iva - totalDescuento;
  return { subtotal, iva, totalDescuento, total, desglose };
}

// Exclusividad: "Toda la compra" y las categorías no se marcan juntas. Luego refresca el preview.
function glpAplicaChange(e) {
  const cb = e.target;
  const tipo = ['porc', 'valor', 'codigo'].find(t => cb.classList.contains('glp-desc-' + t + '-aplica-multi'));
  if (tipo) {
    const todo = document.querySelector('.glp-desc-' + tipo + '-aplica-multi[value="todo"]');
    const items = document.querySelectorAll('.glp-desc-' + tipo + '-aplica-multi:not([value="todo"])');
    if (cb.value === 'todo' && cb.checked) {
      items.forEach(i => (i.checked = false));
    } else if (cb.value !== 'todo' && cb.checked && todo) {
      todo.checked = false;
    }
  }
  glpActualizarPreview();
}

// Arma el URL de un link a partir de su id.
function glpUrlDeLink(linkId) {
  const baseUrl = window.location.origin + window.location.pathname.replace('generador-link-privado.html', '');
  return `${baseUrl}tienda.html?linkId=${linkId}`;
}

// Estado a mostrar: usado (viene de la tienda), expirado (por fecha) o válido.
function glpEstadoLink(link) {
  if (link.estado === 'anulado') return { texto: 'Anulado', clase: 'anulado' };
  if (link.estado === 'usado') return { texto: 'Usado', clase: 'usado' };
  if (link.estado === 'guardado') return { texto: 'Guardado', clase: 'guardado' };
  if (link.fechaExpiracion && new Date(link.fechaExpiracion) < new Date()) return { texto: 'Expirado', clase: 'expirado' };
  return { texto: 'Válido', clase: 'valido' };
}

function glpCopiarHistorial(linkId) {
  const url = glpUrlDeLink(linkId);
  if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
}

// Renueva un link expirado: nuevas 24 horas desde este momento.
async function glpRenovarLink(linkId) {
  try {
    const r = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId, accion: 'renovar' }),
    });
    if (!r.ok) { alert('Hubo un error renovando el link.'); return; }
  } catch (error) {
    alert('Hubo un error renovando el link.');
    return;
  }
  await glpRenderHistorial();
}

// Invalida un link a mano: pasa a "anulado" (no se borra, queda de registro).
async function glpInvalidarLink(linkId) {
  if (!confirm('¿Seguro que quieres invalidar este link? Ya no se podrá usar para pagar.')) return;

  try {
    const r = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId, accion: 'invalidar' }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Hubo un error invalidando el link.'); return; }
  } catch (error) {
    alert('Hubo un error invalidando el link.');
    return;
  }
  await glpRenderHistorial();
}

async function glpActivarLink(linkId) {
  try {
    const r = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId, accion: 'activar' }),
    });
    if (!r.ok) { alert('Hubo un error activando el link.'); return; }
  } catch (error) {
    alert('Hubo un error activando el link.');
    return;
  }
  await glpRenderHistorial();
}

async function glpGenerarPagoFinal(linkIdOrigen, enviarAhora) {
  const mensaje = enviarAhora
    ? '¿Generar el link de pago final y dejarlo activo ahora (24 horas)?'
    : '¿Generar el link de pago final y guardarlo para activarlo después?';
  if (!confirm(mensaje)) return;

  let creado;
  try {
    const r = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'generar_pago_final', linkIdOrigen, enviarAhora }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Hubo un error generando el pago final.'); return; }
    creado = data;
  } catch (error) {
    alert('Hubo un error generando el pago final.');
    return;
  }

  await glpRenderHistorial();
  alert(enviarAhora
    ? 'Listo, ya puedes copiar el link de pago final desde el historial.'
    : 'Listo, quedó guardado. Actívalo desde el historial cuando quieras enviarlo.');
}

// Pinta la tabla del historial de links.
async function glpRenderHistorial() {
  let links;
  try {
    const r = await fetch('/api/links');
    links = await r.json();
  } catch (error) {
    links = [];
  }

  const vacio = document.getElementById('glp-historial-vacio');
  const wrap = document.getElementById('glp-historial-wrap');
  const body = document.getElementById('glp-historial-body');
  if (!vacio || !wrap || !body) return;

  if (links.length === 0) {
    vacio.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }
  vacio.style.display = 'none';
  wrap.style.display = 'block';

  const yaTienePagoFinal = (link) => links.some(l => l.link_relacionado_id === link.link_id);

  body.innerHTML = links.map(link => {
    const estado = glpEstadoLink({ estado: link.estado, fechaExpiracion: link.fecha_expiracion });
    const t = link.totales || { subtotal: 0, iva: 0, totalDescuento: 0, total: 0, desglose: [] };
    const creado = new Date(link.fecha_creacion).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const desgloseHtml = (t.desglose && t.desglose.length)
      ? `<div class="glp-desglose">${t.desglose.map(d => `<span>${d.nombre} (${d.aplicaTexto}): -$${d.monto.toLocaleString('es-CO')}</span>`).join('')}</div>`
      : '';
    const descuentoCelda = t.totalDescuento > 0
      ? `<strong>-$${t.totalDescuento.toLocaleString('es-CO')}</strong>${desgloseHtml}`
      : '—';

    const etiquetaTipoPago = link.tipo_pago === 'adelanto' ? 'Adelanto'
      : link.tipo_pago === 'pago_final' ? 'Pago final' : null;

    const valorPrincipal = link.monto_a_pagar ?? t.total;
    const valorSecundario = link.tipo_pago && link.tipo_pago !== 'total'
      ? `<div class="glp-hist-dato">Total proyecto $${t.total.toLocaleString('es-CO')}</div>`
      : `<div class="glp-hist-dato">Subtotal $${t.subtotal.toLocaleString('es-CO')}</div>`;

    const acciones = [];
    acciones.push(`<button type="button" class="glp-mini-btn" onclick="glpCopiarHistorial('${link.link_id}')">Copiar link</button>`);
    if (estado.clase === 'expirado') {
      acciones.push(`<button type="button" class="glp-mini-btn glp-mini-btn--renovar" onclick="glpRenovarLink('${link.link_id}')">Renovar</button>`);
    }
    if (estado.clase === 'guardado') {
      acciones.push(`<button type="button" class="glp-mini-btn glp-mini-btn--activar" onclick="glpActivarLink('${link.link_id}')">Activar</button>`);
    }
    if (['valido', 'expirado', 'guardado'].includes(estado.clase)) {
      acciones.push(`<button type="button" class="glp-mini-btn glp-mini-btn--invalidar" onclick="glpInvalidarLink('${link.link_id}')">Invalidar</button>`);
    }
    if (link.tipo_pago === 'adelanto' && link.monto_pendiente > 0 && !yaTienePagoFinal(link)) {
      acciones.push(`<button type="button" class="glp-mini-btn" onclick="glpGenerarPagoFinal('${link.link_id}', true)">Pago final: enviar</button>`);
      acciones.push(`<button type="button" class="glp-mini-btn" onclick="glpGenerarPagoFinal('${link.link_id}', false)">Pago final: guardar</button>`);
    }

    return `
      <tr>
        <td>
          <div class="glp-hist-cliente">${link.cliente_nombre}</div>
          ${link.nombre_proyecto ? `<div class="glp-hist-dato">${link.nombre_proyecto}</div>` : ''}
          <div class="glp-hist-dato">${link.cliente_email} · ${link.cliente_telefono}</div>
          ${etiquetaTipoPago ? `<div class="glp-hist-dato">${etiquetaTipoPago}${link.porcentaje_adelanto ? ' (' + link.porcentaje_adelanto + '%)' : ''}</div>` : ''}
        </td>
        <td>${creado}</td>
        <td><span class="glp-badge glp-badge--${estado.clase}">${estado.texto}</span></td>
        <td>${link.vistos_count || 0}</td>
        <td>
          <strong>$${valorPrincipal.toLocaleString('es-CO')}</strong>
          ${valorSecundario}
        </td>
        <td>${descuentoCelda}</td>
        <td>
          <div class="glp-acciones-celda">${acciones.join('')}</div>
        </td>
      </tr>
    `;
  }).join('');
}

async function glpGenerarLink() {
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

  const totales = glpCalcularTotales();
  const tipoPago = document.querySelector('input[name="glp-tipo-pago"]:checked')?.value || 'total';
  const nombreProyecto = document.getElementById('glp-nombre-proyecto').value.trim();
  const porcentajeAdelanto = tipoPago !== 'total'
    ? (parseInt(document.getElementById('glp-porcentaje').value) || 50)
    : null;

  let creado;
  try {
    const r = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nombre, email, telefono }, carrito, extras, totales,
        nombreProyecto: nombreProyecto || null,
        tipoPago, porcentajeAdelanto,
      }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Hubo un error generando el link.'); return; }
    creado = data;
  } catch (error) {
    alert('Hubo un error generando el link. Intenta de nuevo.');
    return;
  }

  await glpRenderHistorial();

  const baseUrl = window.location.origin + window.location.pathname.replace('generador-link-privado.html', '');
  const linkUrl = `${baseUrl}tienda.html?linkId=${creado.link_id}`;

  document.getElementById('glp-resultado-url').value = linkUrl;
  const vence = new Date(creado.fecha_expiracion).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('glp-resultado-nota').textContent =
    `Para ${nombre}. Válido hasta el ${vence} (24 horas).`;
  const glpRes = document.getElementById('glp-resultado');
  glpRes.style.display = 'block';
  glpRes.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function glpCopiarLink() {
  const input = document.getElementById('glp-resultado-url');
  input.select();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).catch(() => {});
  } else {
    document.execCommand('copy');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  glpVerificarAutenticacion();
  glpActualizarExtras();
  glpActualizarEstadoOpciones();
  glpRenderHistorial();
  document.querySelectorAll('.glp-desc-porc-aplica-multi, .glp-desc-valor-aplica-multi, .glp-desc-codigo-aplica-multi')
    .forEach(cb => cb.addEventListener('change', glpAplicaChange));
});