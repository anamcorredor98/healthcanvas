// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE CÓDIGOS DE PROMOCIÓN - JavaScript
// Guarda en localStorage (clave: healthcanvasCodigosPromo). Listo para Vercel.
// ════════════════════════════════════════════════════════════════════════════

// Credenciales: acepta la contraseña oficial Y la de backup.
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

function gcpMostrarContenido() {
  document.getElementById('gcp-modal-auth').style.display = 'none';
  document.getElementById('gcp-contenido').style.display = 'block';
  gcpRenderLista();
  gcpActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE ALMACENAMIENTO Y FORMATO
// ════════════════════════════════════════════════════════════════════════════

function gcpLeer() {
  try {
    return JSON.parse(localStorage.getItem('healthcanvasCodigosPromo') || '[]');
  } catch (e) {
    return [];
  }
}

function gcpGuardar(codigos) {
  localStorage.setItem('healthcanvasCodigosPromo', JSON.stringify(codigos));
}

// Mayúsculas + sin tildes + sin ñ.
function gcpLimpiarBase(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
// Solo letras (para el motivo).
function gcpLimpiarLetras(str) {
  return gcpLimpiarBase(str).replace(/[^A-Z]/g, '');
}
// Letras y números (para el año).
function gcpLimpiarAnio(str) {
  return gcpLimpiarBase(str).replace(/[^A-Z0-9]/g, '');
}

function gcpCOP(n) {
  return '$' + (n || 0).toLocaleString('es-CO');
}

// Fecha "YYYY-MM-DD" → "DD/MM/YYYY" (sin problemas de zona horaria).
function gcpFecha(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// Fecha de hoy local en formato "YYYY-MM-DD".
function gcpHoyISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════════════
// ARMADO DEL CÓDIGO
// ════════════════════════════════════════════════════════════════════════════

function gcpCodigoExiste(codigo, codigos) {
  return codigos.some(c => c.codigo === codigo);
}

// base = MOTIVO + AÑO. Duplicados: guion + número antes de HC (NAVIDAD26-1HC).
function gcpResolverCodigo(base, codigos) {
  const candidato = base + 'HC';
  if (!gcpCodigoExiste(candidato, codigos)) return candidato;
  let n = 1;
  while (gcpCodigoExiste(`${base}-${n}HC`, codigos)) n++;
  return `${base}-${n}HC`;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERACCIÓN DEL FORMULARIO
// ════════════════════════════════════════════════════════════════════════════

function gcpActualizarPreview() {
  const motivo = gcpLimpiarLetras(document.getElementById('gcp-motivo').value);
  const anio = gcpLimpiarAnio(document.getElementById('gcp-anio').value);
  const el = document.getElementById('gcp-preview');
  const base = motivo + anio;
  el.textContent = motivo ? gcpResolverCodigo(base, gcpLeer()) : '—';
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

// "Toda la compra" es excluyente con las categorías específicas.
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

function gcpCrearCodigo() {
  const codigos = gcpLeer();
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
  let maxUsos = null;
  if (maxRaw !== '') {
    maxUsos = parseInt(maxRaw) || 0;
    if (maxUsos < 1) return gcpMostrarAviso('El máximo de usos debe ser al menos 1, o déjalo en blanco.');
  }

  const base = motivo + anio;
  const codigo = gcpResolverCodigo(base, codigos);

  const nuevo = {
    codigo,
    motivo,
    anio,
    descuento: { tipo, valor },
    fechaInicio: fi,
    fechaFin: ff,
    maxUsosGlobales: maxUsos,
    usosActuales: 0,
    aplicaA,
    estado: 'activo',
    descripcion: document.getElementById('gcp-descripcion').value.trim(),
    fechaCreacion: new Date().toISOString(),
  };

  codigos.unshift(nuevo);
  gcpGuardar(codigos);

  const descTexto = tipo === 'porcentaje' ? `${valor}%` : gcpCOP(valor);
  document.getElementById('gcp-resultado-codigo').textContent = codigo;
  document.getElementById('gcp-resultado-detalle').textContent =
    `${descTexto} de descuento · vigente del ${gcpFecha(fi)} al ${gcpFecha(ff)}.`;
  document.getElementById('gcp-resultado').style.display = 'block';

  gcpLimpiarFormulario();
  gcpRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// ESTADO (activo / pausado / vencido / programado)
// ════════════════════════════════════════════════════════════════════════════

function gcpEstadoDisplay(c) {
  if (c.estado === 'pausado') return { texto: 'Pausado', clase: 'pausado' };
  const hoy = gcpHoyISO();
  if (c.fechaFin < hoy) return { texto: 'Vencido', clase: 'vencido' };
  if (c.fechaInicio > hoy) return { texto: 'Programado', clase: 'programado' };
  return { texto: 'Activo', clase: 'activo' };
}

function gcpTogglePausa(codigo) {
  const codigos = gcpLeer();
  const c = codigos.find(x => x.codigo === codigo);
  if (!c) return;
  c.estado = c.estado === 'pausado' ? 'activo' : 'pausado';
  gcpGuardar(codigos);
  gcpRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE TODOS LOS CÓDIGOS
// ════════════════════════════════════════════════════════════════════════════

function gcpRenderLista() {
  const codigos = gcpLeer();
  const vacia = document.getElementById('gcp-lista-vacia');
  const wrap = document.getElementById('gcp-lista-wrap');
  const body = document.getElementById('gcp-lista-body');

  if (codigos.length === 0) {
    vacia.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }

  vacia.style.display = 'none';
  wrap.style.display = 'block';

  body.innerHTML = codigos.map(c => {
    const desc = c.descuento.tipo === 'porcentaje' ? `${c.descuento.valor}%` : gcpCOP(c.descuento.valor);
    const vigencia = `${gcpFecha(c.fechaInicio)} – ${gcpFecha(c.fechaFin)}`;
    const aplica = c.aplicaA.map(a => GCP_APLICA_LABEL[a] || a).join(', ');
    const usos = `${c.usosActuales} / ${c.maxUsosGlobales === null ? '∞' : c.maxUsosGlobales}`;
    const estado = gcpEstadoDisplay(c);

    let accion = '';
    if (estado.clase !== 'vencido') {
      const texto = c.estado === 'pausado' ? 'Activar' : 'Pausar';
      accion = `<button type="button" class="gcp-mini-btn" onclick="gcpTogglePausa('${c.codigo}')">${texto}</button>`;
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