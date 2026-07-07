// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE CÓDIGOS DE PROMOCIÓN - JavaScript
// Ahora usa Supabase (vía /api/promociones) en vez de localStorage.
// ════════════════════════════════════════════════════════════════════════════

const GCP_CRED = {
  usuario: 'ana-promo',
  contrasenas: ['E5h#Jt2@Sw9$Bm3', 'U7r!Cf4&Pq6$Zn8'],
};

const GCP_APLICA_LABEL = {
  todo: 'Toda la compra',
  plan: 'Plan',
  elementos: 'Elementos sueltos',
  complementos: 'Complementos',
  extras: 'Extras',
};

// ════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

function gcpManejarLogin(event) {
  event.preventDefault();
  const usuario = document.getElementById('gcp-usuario').value;
  const contrasena = document.getElementById('gcp-contrasena').value;
  const errorDiv = document.getElementById('gcp-error-login');

  if (usuario === GCP_CRED.usuario && GCP_CRED.contrasenas.includes(contrasena)) {
    localStorage.setItem('gcp-autenticado', 'true');
    gcpMostrarContenido();
  } else {
    errorDiv.textContent = 'Usuario o contraseña incorrectos';
    errorDiv.style.display = 'block';
    document.getElementById('gcp-contrasena').value = '';
  }
}

function gcpCerrarSesion() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('gcp-autenticado');
    location.reload();
  }
}

function gcpVerificarAutenticacion() {
  if (localStorage.getItem('gcp-autenticado') === 'true') {
    gcpMostrarContenido();
  } else {
    document.getElementById('gcp-modal-auth').style.display = 'flex';
    document.getElementById('gcp-contenido').style.display = 'none';
  }
}

async function gcpMostrarContenido() {
  document.getElementById('gcp-modal-auth').style.display = 'none';
  document.getElementById('gcp-contenido').style.display = 'block';
  await gcpRenderLista();
  gcpActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE FORMATO
// ════════════════════════════════════════════════════════════════════════════

function gcpLimpiarBase(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
function gcpLimpiarLetras(str) {
  return gcpLimpiarBase(str).replace(/[^A-Z]/g, '');
}
function gcpLimpiarAnio(str) {
  return gcpLimpiarBase(str).replace(/[^A-Z0-9]/g, '');
}

function gcpCOP(n) {
  return '$' + (n || 0).toLocaleString('es-CO');
}

function gcpFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PREVIA (sin revisar duplicados; eso lo hace el servidor al crear)
// ════════════════════════════════════════════════════════════════════════════

function gcpActualizarPreview() {
  const motivo = gcpLimpiarLetras(document.getElementById('gcp-motivo').value);
  const anio = gcpLimpiarAnio(document.getElementById('gcp-anio').value);
  const el = document.getElementById('gcp-preview');
  el.textContent = motivo ? `${motivo}${anio}HC` : '—';
}

function gcpCambiarTipoDescuento() {
  const tipo = document.getElementById('gcp-desc-tipo').value;
  const label = document.getElementById('gcp-desc-valor-label');
  const input = document.getElementById('gcp-desc-valor');
  if (tipo === 'valor') {
    label.textContent = 'Valor del descuento (COP)';
    input.placeholder = 'Ej: 50000';
  } else {
    label.textContent = 'Porcentaje de descuento';
    input.placeholder = 'Ej: 10';
  }
}

function gcpAplicaChange(quien) {
  const todo = document.getElementById('gcp-aplica-todo');
  const items = document.querySelectorAll('.gcp-aplica-item');

  if (quien === 'todo' && todo.checked) {
    items.forEach(i => (i.checked = false));
  } else if (quien === 'item') {
    const algunoMarcado = Array.from(items).some(i => i.checked);
    if (algunoMarcado) todo.checked = false;
  }
}

function gcpAplicaSeleccionados() {
  if (document.getElementById('gcp-aplica-todo').checked) return ['todo'];
  return Array.from(document.querySelectorAll('.gcp-aplica-item'))
    .filter(i => i.checked)
    .map(i => i.value);
}

function gcpMostrarAviso(msg) {
  const a = document.getElementById('gcp-crear-aviso');
  a.textContent = msg;
  a.style.display = 'block';
}

function gcpLimpiarFormulario() {
  document.getElementById('gcp-motivo').value = '';
  document.getElementById('gcp-anio').value = '';
  document.getElementById('gcp-desc-tipo').value = 'porcentaje';
  document.getElementById('gcp-desc-valor').value = '';
  document.getElementById('gcp-fecha-inicio').value = '';
  document.getElementById('gcp-fecha-fin').value = '';
  document.getElementById('gcp-max-usos').value = '';
  document.getElementById('gcp-descripcion').value = '';
  document.getElementById('gcp-aplica-todo').checked = false;
  document.querySelectorAll('.gcp-aplica-item').forEach(i => (i.checked = false));
  gcpCambiarTipoDescuento();
  gcpActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// CREAR CÓDIGO
// ════════════════════════════════════════════════════════════════════════════

async function gcpCrearCodigo() {
  document.getElementById('gcp-crear-aviso').style.display = 'none';

  const motivo = gcpLimpiarLetras(document.getElementById('gcp-motivo').value);
  if (!motivo) return gcpMostrarAviso('Escribe el motivo del código.');

  const anio = gcpLimpiarAnio(document.getElementById('gcp-anio').value);
  if (!anio) return gcpMostrarAviso('Escribe el año del código.');

  const tipo = document.getElementById('gcp-desc-tipo').value;
  const valor = parseInt(document.getElementById('gcp-desc-valor').value) || 0;
  if (valor <= 0) return gcpMostrarAviso('Escribe un descuento mayor a 0.');
  if (tipo === 'porcentaje' && valor > 100) {
    return gcpMostrarAviso('El porcentaje no puede ser mayor a 100.');
  }

  const fi = document.getElementById('gcp-fecha-inicio').value;
  const ff = document.getElementById('gcp-fecha-fin').value;
  if (!fi || !ff) return gcpMostrarAviso('Selecciona la fecha de inicio y la de finalización.');
  if (ff < fi) return gcpMostrarAviso('La fecha de finalización no puede ser anterior a la de inicio.');

  const aplicaA = gcpAplicaSeleccionados();
  if (aplicaA.length === 0) return gcpMostrarAviso('Selecciona a qué aplica el código.');

  const maxRaw = document.getElementById('gcp-max-usos').value.trim();
  let maxUsosGlobales = null;
  if (maxRaw !== '') {
    maxUsosGlobales = parseInt(maxRaw) || 0;
    if (maxUsosGlobales < 1) return gcpMostrarAviso('El máximo de usos debe ser al menos 1, o déjalo en blanco.');
  }

  let creado;
  try {
    const r = await fetch('/api/promociones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo, anio,
        descuentoTipo: tipo,
        descuentoValor: valor,
        fechaInicio: fi,
        fechaFin: ff,
        maxUsosGlobales,
        aplicaA,
        descripcion: document.getElementById('gcp-descripcion').value.trim(),
      }),
    });
    if (!r.ok) throw new Error('fallo');
    creado = await r.json();
  } catch (error) {
    return gcpMostrarAviso('Hubo un error creando el código. Intenta de nuevo.');
  }

  const descTexto = tipo === 'porcentaje' ? `${valor}%` : gcpCOP(valor);
  document.getElementById('gcp-resultado-codigo').textContent = creado.codigo;
  document.getElementById('gcp-resultado-detalle').textContent =
    `${descTexto} de descuento · vigente del ${gcpFecha(fi)} al ${gcpFecha(ff)}.`;
  document.getElementById('gcp-resultado').style.display = 'block';

  gcpLimpiarFormulario();
  await gcpRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// PAUSAR / ACTIVAR
// ════════════════════════════════════════════════════════════════════════════

async function gcpTogglePausa(codigo, estadoActual) {
  const nuevoEstado = estadoActual === 'pausado' ? 'activo' : 'pausado';
  try {
    await fetch('/api/promociones', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, estado: nuevoEstado }),
    });
  } catch (error) {
    alert('Hubo un error actualizando el código.');
    return;
  }
  await gcpRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE TODOS LOS CÓDIGOS
// ════════════════════════════════════════════════════════════════════════════

async function gcpRenderLista() {
  let codigos;
  try {
    const r = await fetch('/api/promociones');
    codigos = await r.json();
  } catch (error) {
    codigos = [];
  }

  const vacia = document.getElementById('gcp-lista-vacia');
  const wrap = document.getElementById('gcp-lista-wrap');
  const body = document.getElementById('gcp-lista-body');

  if (!codigos.length) {
    vacia.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }

  vacia.style.display = 'none';
  wrap.style.display = 'block';

  body.innerHTML = codigos.map(c => {
    const desc = c.descuento_tipo === 'porcentaje' ? `${c.descuento_valor}%` : gcpCOP(c.descuento_valor);
    const vigencia = `${gcpFecha(c.fecha_inicio)} – ${gcpFecha(c.fecha_fin)}`;
    const aplica = c.aplica_a.map(a => GCP_APLICA_LABEL[a] || a).join(', ');
    const usos = `${c.usos_actuales} / ${c.max_usos_globales === null ? '∞' : c.max_usos_globales}`;
    const estado = c.estado_mostrado;

    let accion = '';
    if (estado.clase !== 'vencido') {
      const texto = c.estado === 'pausado' ? 'Activar' : 'Pausar';
      accion = `<button type="button" class="gcp-mini-btn" onclick="gcpTogglePausa('${c.codigo}', '${c.estado}')">${texto}</button>`;
    }
    accion += `<button type="button" class="gcp-mini-btn" onclick="gcpCopiar('${c.codigo}')">Copiar</button>`;

    return `
      <tr>
        <td><strong>${c.codigo}</strong></td>
        <td>${desc}</td>
        <td>${vigencia}</td>
        <td>${aplica}</td>
        <td>${usos}</td>
        <td><span class="gcp-badge gcp-badge--${estado.clase}">${estado.texto}</span></td>
        <td><div class="gcp-acciones-celda">${accion}</div></td>
      </tr>
    `;
  }).join('');
}

// ════════════════════════════════════════════════════════════════════════════
// COPIAR AL PORTAPAPELES
// ════════════════════════════════════════════════════════════════════════════

function gcpCopiar(valor) {
  const el = document.getElementById(valor);
  const texto = el ? el.textContent.trim() : valor;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).catch(() => {});
  }
}

// ════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function () {
  gcpVerificarAutenticacion();
});