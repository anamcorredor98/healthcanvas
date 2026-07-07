// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE CÓDIGOS DE REFERIDO - JavaScript
// Ahora usa Supabase (vía /api/referidos) en vez de localStorage.
// ════════════════════════════════════════════════════════════════════════════

const GCR_CRED = {
  usuario: 'ana-referral',
  contrasenas: ['P3z@Bc9$Gf2#Mw6', 'L8q!Dn7&Ck4$Vx1'],
};

const GCR_PROFESIONES = {
  DR: 'Médico(a)', PSI: 'Psicólogo(a)', PSIQ: 'Psiquiatra', OD: 'Odontólogo(a)',
  NUT: 'Nutricionista', FT: 'Fisioterapeuta', FON: 'Fonoaudiólogo(a)',
  TO: 'Terapeuta ocupacional', OPT: 'Optómetra', ENF: 'Enfermero(a)', VET: 'Veterinario(a)',
};

// Cache en memoria de la última lista traída del servidor (para búsqueda instantánea)
let gcrCache = [];

// ════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

function gcrManejarLogin(event) {
  event.preventDefault();
  const usuario = document.getElementById('gcr-usuario').value;
  const contrasena = document.getElementById('gcr-contrasena').value;
  const errorDiv = document.getElementById('gcr-error-login');

  if (usuario === GCR_CRED.usuario && GCR_CRED.contrasenas.includes(contrasena)) {
    localStorage.setItem('gcr-autenticado', 'true');
    gcrMostrarContenido();
  } else {
    errorDiv.textContent = 'Usuario o contraseña incorrectos';
    errorDiv.style.display = 'block';
    document.getElementById('gcr-contrasena').value = '';
  }
}

function gcrCerrarSesion() {
  if (confirm('¿Cerrar sesión?')) {
    localStorage.removeItem('gcr-autenticado');
    location.reload();
  }
}

function gcrVerificarAutenticacion() {
  if (localStorage.getItem('gcr-autenticado') === 'true') {
    gcrMostrarContenido();
  } else {
    document.getElementById('gcr-modal-auth').style.display = 'flex';
    document.getElementById('gcr-contenido').style.display = 'none';
  }
}

async function gcrMostrarContenido() {
  document.getElementById('gcr-modal-auth').style.display = 'none';
  document.getElementById('gcr-contenido').style.display = 'block';
  await gcrRenderLista();
  gcrActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE FORMATO
// ════════════════════════════════════════════════════════════════════════════

function gcrLimpiarBase(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
function gcrLimpiarLetras(str) {
  return gcrLimpiarBase(str).replace(/[^A-Z]/g, '');
}
function gcrLimpiarAlfanum(str) {
  return gcrLimpiarBase(str).replace(/[^A-Z0-9]/g, '');
}

function gcrCOP(n) {
  return '$' + (n || 0).toLocaleString('es-CO');
}
function gcrFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function gcrEstadoLabel(estado) {
  return estado === 'desactivado' ? 'Desactivado' : 'Activo';
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA PREVIA (sin revisar duplicados; eso lo hace el servidor al crear)
// ════════════════════════════════════════════════════════════════════════════

function gcrPrefijoActual() {
  const sel = document.getElementById('gcr-profesion').value;
  if (sel === '__sin__') return { prefijo: '', valido: true };
  if (sel === '__otro__') {
    const p = gcrLimpiarLetras(document.getElementById('gcr-prefijo-otro').value);
    return { prefijo: p, valido: p.length > 0 };
  }
  return { prefijo: sel, valido: true };
}

function gcrProfesionLabelActual() {
  const sel = document.getElementById('gcr-profesion').value;
  if (sel === '__sin__') return null;
  if (sel === '__otro__') return 'Otros';
  return GCR_PROFESIONES[sel] || null;
}

function gcrCambiarTipo() {
  const tipo = document.querySelector('input[name="gcr-tipo"]:checked').value;
  document.getElementById('gcr-bloque-automatico').style.display = tipo === 'automatico' ? 'block' : 'none';
  document.getElementById('gcr-bloque-personalizado').style.display = tipo === 'personalizado' ? 'block' : 'none';
  document.getElementById('gcr-resultado').style.display = 'none';
  document.getElementById('gcr-generar-aviso').style.display = 'none';
  gcrActualizarPreview();
}

function gcrCambiarProfesion() {
  const sel = document.getElementById('gcr-profesion').value;
  document.getElementById('gcr-prefijo-otro-wrap').style.display = sel === '__otro__' ? 'block' : 'none';
  gcrActualizarPreview();
}

function gcrActualizarPreview() {
  const tipo = document.querySelector('input[name="gcr-tipo"]:checked').value;
  const el = document.getElementById('gcr-preview');

  if (tipo === 'automatico') {
    const { prefijo } = gcrPrefijoActual();
    const nombreCod = gcrLimpiarLetras(document.getElementById('gcr-nombre-codigo').value);
    const base = (prefijo + nombreCod).slice(0, 8);
    el.textContent = base ? `${base}HC` : '—';
  } else {
    const c = gcrLimpiarAlfanum(document.getElementById('gcr-codigo-personalizado').value);
    el.textContent = c || '—';
  }
}

function gcrMostrarAviso(msg) {
  const a = document.getElementById('gcr-generar-aviso');
  a.textContent = msg;
  a.style.display = 'block';
}

function gcrLimpiarFormulario() {
  document.getElementById('gcr-nombre-codigo').value = '';
  document.getElementById('gcr-codigo-personalizado').value = '';
  document.getElementById('gcr-prop-nombre').value = '';
  document.getElementById('gcr-prop-email').value = '';
  document.getElementById('gcr-prop-telefono').value = '';
  document.getElementById('gcr-prefijo-otro').value = '';
  gcrActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// GENERAR CÓDIGO
// ════════════════════════════════════════════════════════════════════════════

async function gcrGenerarCodigo() {
  document.getElementById('gcr-generar-aviso').style.display = 'none';
  const tipo = document.querySelector('input[name="gcr-tipo"]:checked').value;

  const nombreProp = document.getElementById('gcr-prop-nombre').value.trim();
  const email = document.getElementById('gcr-prop-email').value.trim();
  const telefono = document.getElementById('gcr-prop-telefono').value.trim();

  if (!nombreProp || !email || !telefono) {
    return gcrMostrarAviso('Completa el nombre, el correo y el teléfono del cliente.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return gcrMostrarAviso('El correo no tiene un formato válido.');
  }

  const payload = {
    tipo,
    propietarioNombre: nombreProp,
    propietarioEmail: email,
    propietarioTelefono: telefono,
  };

  if (tipo === 'automatico') {
    const { prefijo, valido } = gcrPrefijoActual();
    if (!valido) return gcrMostrarAviso('Escribe el prefijo personalizado.');
    const nombreCod = gcrLimpiarLetras(document.getElementById('gcr-nombre-codigo').value);
    if (!nombreCod) return gcrMostrarAviso('Escribe el nombre para el código.');
    payload.prefijo = prefijo;
    payload.nombreCodigo = nombreCod;
    payload.profesion = gcrProfesionLabelActual();
  } else {
    const codigo = gcrLimpiarAlfanum(document.getElementById('gcr-codigo-personalizado').value);
    if (!codigo) return gcrMostrarAviso('Escribe el código personalizado.');
    payload.codigoPersonalizado = codigo;
  }

  let creado;
  try {
    const r = await fetch('/api/referidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) return gcrMostrarAviso(data.error || 'Hubo un error creando el código.');
    creado = data;
  } catch (error) {
    return gcrMostrarAviso('Hubo un error creando el código. Intenta de nuevo.');
  }

  document.getElementById('gcr-resultado-codigo').textContent = creado.codigo;
  document.getElementById('gcr-resultado-detalle').textContent =
    `Para ${nombreProp}. Compártelo con el cliente para que lo use en sus referidos.`;
  document.getElementById('gcr-resultado').style.display = 'block';

  gcrLimpiarFormulario();
  await gcrRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// BUSCAR (sobre el cache en memoria, no consulta el servidor otra vez)
// ════════════════════════════════════════════════════════════════════════════

function gcrBuscar() {
  const q = document.getElementById('gcr-buscar-input').value.trim().toLowerCase();
  const cont = document.getElementById('gcr-buscar-resultado');

  if (!q) {
    cont.innerHTML = '';
    return;
  }

  const matches = gcrCache.filter(c =>
    c.codigo.toLowerCase().includes(q) ||
    c.propietario_nombre.toLowerCase().includes(q) ||
    c.propietario_email.toLowerCase().includes(q) ||
    c.propietario_telefono.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    cont.innerHTML = '<p class="gcr-buscar-vacio">No encontré ningún código con esos datos.</p>';
    return;
  }

  cont.innerHTML = matches.map(gcrRenderTarjetaCodigo).join('');
}

function gcrRenderTarjetaCodigo(c) {
  const esActivo = c.estado === 'activo';
  const reemplazoInfo = c.estado === 'desactivado' && c.reemplazado_por
    ? `<p class="gcr-tarjeta__nota">Reemplazado por <strong>${c.reemplazado_por}</strong></p>` : '';
  const reemplazaInfo = c.reemplaza_a
    ? `<p class="gcr-tarjeta__nota">Reemplaza a ${c.reemplaza_a}</p>` : '';

  return `
    <div class="gcr-tarjeta">
      <div class="gcr-tarjeta__head">
        <strong class="gcr-tarjeta__codigo">${c.codigo}</strong>
        <span class="gcr-badge gcr-badge--${c.estado}">${gcrEstadoLabel(c.estado)}</span>
      </div>
      <p class="gcr-tarjeta__cliente">${c.propietario_nombre}</p>
      <p class="gcr-tarjeta__dato">${c.propietario_email} · ${c.propietario_telefono}</p>
      ${reemplazoInfo}${reemplazaInfo}
      <div class="gcr-tarjeta__stats">
        <span>Referidos: <strong>${c.referidos}</strong></span>
        <span>Cashback disponible: <strong>${gcrCOP(c.cashback_disponible)}</strong></span>
        <span>Cashback histórico: <strong>${gcrCOP(c.cashback_historico)}</strong></span>
      </div>
      <div class="gcr-tarjeta__acciones">
        <button type="button" class="btn btn--outline" onclick="gcrCopiar('${c.codigo}')">Copiar código</button>
        ${esActivo ? `<button type="button" class="btn btn--primary" onclick="gcrGenerarReemplazo('${c.codigo}')">Generar reemplazo</button>` : ''}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════════════════
// GENERAR REEMPLAZO
// ════════════════════════════════════════════════════════════════════════════

async function gcrGenerarReemplazo(codigoViejo) {
  const viejo = gcrCache.find(c => c.codigo === codigoViejo);
  if (!viejo || viejo.estado !== 'activo') return;

  let nuevoCodigo = null;

  if (viejo.tipo === 'personalizado') {
    const entrada = prompt('Escribe el nuevo código de reemplazo:', '');
    if (entrada === null) return;
    nuevoCodigo = gcrLimpiarAlfanum(entrada);
    if (!nuevoCodigo) { alert('El código no puede estar vacío.'); return; }
  }

  const ok = confirm(
    `Vas a desactivar ${viejo.codigo} y crear un reemplazo para ${viejo.propietario_nombre}.\n\n` +
    `El cashback y los referidos se pasan al código nuevo. ¿Continuar?`
  );
  if (!ok) return;

  let creado;
  try {
    const r = await fetch('/api/referidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigoViejo, nuevoCodigo }),
    });
    const data = await r.json();
    if (!r.ok) { alert(data.error || 'Hubo un error generando el reemplazo.'); return; }
    creado = data;
  } catch (error) {
    alert('Hubo un error generando el reemplazo.');
    return;
  }

  await gcrRenderLista();
  gcrBuscar(); // refresca la búsqueda actual con el cache ya actualizado
  alert(`Listo. Nuevo código: ${creado.codigo}`);
}

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE TODOS LOS CÓDIGOS
// ════════════════════════════════════════════════════════════════════════════

async function gcrRenderLista() {
  try {
    const r = await fetch('/api/referidos');
    gcrCache = await r.json();
  } catch (error) {
    gcrCache = [];
  }

  const vacia = document.getElementById('gcr-lista-vacia');
  const wrap = document.getElementById('gcr-lista-wrap');
  const body = document.getElementById('gcr-lista-body');

  if (gcrCache.length === 0) {
    vacia.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }

  vacia.style.display = 'none';
  wrap.style.display = 'block';

  body.innerHTML = gcrCache.map(c => `
    <tr class="${c.estado === 'desactivado' ? 'gcr-fila-desactivada' : ''}">
      <td><strong>${c.codigo}</strong></td>
      <td>${c.propietario_nombre}</td>
      <td><span class="gcr-badge gcr-badge--${c.estado}">${gcrEstadoLabel(c.estado)}</span></td>
      <td>${c.referidos}</td>
      <td>${gcrCOP(c.cashback_disponible)}</td>
      <td>${gcrFecha(c.fecha_creacion)}</td>
    </tr>
  `).join('');
}

// ════════════════════════════════════════════════════════════════════════════
// COPIAR AL PORTAPAPELES
// ════════════════════════════════════════════════════════════════════════════

function gcrCopiar(valor) {
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
  gcrVerificarAutenticacion();
});