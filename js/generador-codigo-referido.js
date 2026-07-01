// ════════════════════════════════════════════════════════════════════════════
// GENERADOR DE CÓDIGOS DE REFERIDO - JavaScript
// Guarda en localStorage (clave: healthcanvasCodigosReferido). Listo para Vercel.
// ════════════════════════════════════════════════════════════════════════════

// Credenciales: acepta la contraseña oficial Y la de backup.
const GCR_CRED = {
  usuario: 'ana-referral',
  contrasenas: ['P3z@Bc9$Gf2#Mw6', 'L8q!Dn7&Ck4$Vx1'],
};

// Mapa de profesión → etiqueta (el prefijo viene del value del <option>).
const GCR_PROFESIONES = {
  DR:   'Médico(a)',
  PSI:  'Psicólogo(a)',
  PSIQ: 'Psiquiatra',
  OD:   'Odontólogo(a)',
  NUT:  'Nutricionista',
  FT:   'Fisioterapeuta',
  FON:  'Fonoaudiólogo(a)',
  TO:   'Terapeuta ocupacional',
  OPT:  'Optómetra',
  ENF:  'Enfermero(a)',
  VET:  'Veterinario(a)',
};

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

function gcrMostrarContenido() {
  document.getElementById('gcr-modal-auth').style.display = 'none';
  document.getElementById('gcr-contenido').style.display = 'block';
  gcrRenderLista();
  gcrActualizarPreview();
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE ALMACENAMIENTO Y FORMATO
// ════════════════════════════════════════════════════════════════════════════

function gcrLeerCodigos() {
  try {
    return JSON.parse(localStorage.getItem('healthcanvasCodigosReferido') || '[]');
  } catch (e) {
    return [];
  }
}

function gcrGuardarCodigos(codigos) {
  localStorage.setItem('healthcanvasCodigosReferido', JSON.stringify(codigos));
}

// Mayúsculas + sin tildes + sin ñ (ñ→N por la normalización).
function gcrLimpiarBase(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
// Solo letras (para nombre y prefijo del código automático).
function gcrLimpiarLetras(str) {
  return gcrLimpiarBase(str).replace(/[^A-Z]/g, '');
}
// Letras y números (para el código personalizado).
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
// ARMADO DEL CÓDIGO
// ════════════════════════════════════════════════════════════════════════════

// Devuelve el prefijo actual según el dropdown, y si es válido.
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

function gcrCodigoExiste(codigo, codigos) {
  return codigos.some(c => c.codigo === codigo);
}

// A partir de una base (≤8 letras), arma el código con HC y resuelve duplicados
// metiendo el número antes del sufijo: DRGARCIAHC → DRGARCIA1HC → DRGARCIA2HC ...
function gcrResolverCodigoAuto(base, codigos) {
  let candidato = base + 'HC';
  if (!gcrCodigoExiste(candidato, codigos)) return candidato;
  let n = 1;
  while (gcrCodigoExiste(base + n + 'HC', codigos)) n++;
  return base + n + 'HC';
}

// ════════════════════════════════════════════════════════════════════════════
// INTERACCIÓN DEL FORMULARIO
// ════════════════════════════════════════════════════════════════════════════

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
    el.textContent = base ? gcrResolverCodigoAuto(base, gcrLeerCodigos()) : '—';
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

function gcrGenerarCodigo() {
  const codigos = gcrLeerCodigos();
  const tipo = document.querySelector('input[name="gcr-tipo"]:checked').value;
  document.getElementById('gcr-generar-aviso').style.display = 'none';

  // Datos del dueño del código (referidor).
  const nombreProp = document.getElementById('gcr-prop-nombre').value.trim();
  const email = document.getElementById('gcr-prop-email').value.trim();
  const telefono = document.getElementById('gcr-prop-telefono').value.trim();

  if (!nombreProp || !email || !telefono) {
    return gcrMostrarAviso('Completa el nombre, el correo y el teléfono del cliente.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return gcrMostrarAviso('El correo no tiene un formato válido.');
  }

  let codigo, base = null, profesionLabel = null;

  if (tipo === 'automatico') {
    const { prefijo, valido } = gcrPrefijoActual();
    if (!valido) return gcrMostrarAviso('Escribe el prefijo personalizado.');

    const nombreCod = gcrLimpiarLetras(document.getElementById('gcr-nombre-codigo').value);
    if (!nombreCod) return gcrMostrarAviso('Escribe el nombre para el código.');

    base = (prefijo + nombreCod).slice(0, 8);
    if (!base) return gcrMostrarAviso('No se pudo armar el código. Revisa el nombre.');

    codigo = gcrResolverCodigoAuto(base, codigos);
    profesionLabel = gcrProfesionLabelActual();
  } else {
    codigo = gcrLimpiarAlfanum(document.getElementById('gcr-codigo-personalizado').value);
    if (!codigo) return gcrMostrarAviso('Escribe el código personalizado.');
    if (gcrCodigoExiste(codigo, codigos)) {
      return gcrMostrarAviso('Ese código ya existe. Usa otro.');
    }
  }

  const nuevo = {
    codigo,
    tipo,
    base,                 // interno: base sin número ni HC (para el reemplazo automático)
    profesion: profesionLabel,
    propietario: { nombre: nombreProp, email, telefono },
    fechaCreacion: new Date().toISOString(),
    estado: 'activo',
    reemplazaA: null,
    reemplazadoPor: null,
    referidos: 0,
    cashbackDisponible: 0,
    cashbackHistorico: 0,
    cashbacks: [],
  };

  codigos.unshift(nuevo);
  gcrGuardarCodigos(codigos);

  // Mostrar resultado.
  document.getElementById('gcr-resultado-codigo').textContent = codigo;
  document.getElementById('gcr-resultado-detalle').textContent =
    `Para ${nombreProp}. Compártelo con el cliente para que lo use en sus referidos.`;
  document.getElementById('gcr-resultado').style.display = 'block';

  gcrLimpiarFormulario();
  gcrRenderLista();
}

// ════════════════════════════════════════════════════════════════════════════
// BUSCAR / RECUPERAR / REEMPLAZAR
// ════════════════════════════════════════════════════════════════════════════

function gcrBuscar() {
  const q = document.getElementById('gcr-buscar-input').value.trim().toLowerCase();
  const cont = document.getElementById('gcr-buscar-resultado');

  if (!q) {
    cont.innerHTML = '';
    return;
  }

  const codigos = gcrLeerCodigos();
  const matches = codigos.filter(c =>
    c.codigo.toLowerCase().includes(q) ||
    c.propietario.nombre.toLowerCase().includes(q) ||
    c.propietario.email.toLowerCase().includes(q) ||
    c.propietario.telefono.toLowerCase().includes(q)
  );

  if (matches.length === 0) {
    cont.innerHTML = '<p class="gcr-buscar-vacio">No encontré ningún código con esos datos.</p>';
    return;
  }

  cont.innerHTML = matches.map(gcrRenderTarjetaCodigo).join('');
}

function gcrRenderTarjetaCodigo(c) {
  const esActivo = c.estado === 'activo';
  const reemplazoInfo = c.estado === 'desactivado' && c.reemplazadoPor
    ? `<p class="gcr-tarjeta__nota">Reemplazado por <strong>${c.reemplazadoPor}</strong></p>` : '';
  const reemplazaInfo = c.reemplazaA
    ? `<p class="gcr-tarjeta__nota">Reemplaza a ${c.reemplazaA}</p>` : '';

  return `
    <div class="gcr-tarjeta">
      <div class="gcr-tarjeta__head">
        <strong class="gcr-tarjeta__codigo">${c.codigo}</strong>
        <span class="gcr-badge gcr-badge--${c.estado}">${gcrEstadoLabel(c.estado)}</span>
      </div>
      <p class="gcr-tarjeta__cliente">${c.propietario.nombre}</p>
      <p class="gcr-tarjeta__dato">${c.propietario.email} · ${c.propietario.telefono}</p>
      ${reemplazoInfo}${reemplazaInfo}
      <div class="gcr-tarjeta__stats">
        <span>Referidos: <strong>${c.referidos}</strong></span>
        <span>Cashback disponible: <strong>${gcrCOP(c.cashbackDisponible)}</strong></span>
        <span>Cashback histórico: <strong>${gcrCOP(c.cashbackHistorico)}</strong></span>
      </div>
      <div class="gcr-tarjeta__acciones">
        <button type="button" class="btn btn--outline" onclick="gcrCopiar('${c.codigo}')">Copiar código</button>
        ${esActivo ? `<button type="button" class="btn btn--primary" onclick="gcrGenerarReemplazo('${c.codigo}')">Generar reemplazo</button>` : ''}
      </div>
    </div>
  `;
}

function gcrGenerarReemplazo(codigoViejo) {
  const codigos = gcrLeerCodigos();
  const viejo = codigos.find(c => c.codigo === codigoViejo);
  if (!viejo || viejo.estado !== 'activo') return;

  let nuevoCodigo;

  if (viejo.tipo === 'automatico' && viejo.base) {
    // El viejo sigue guardado, así que el nuevo toma el siguiente número libre.
    nuevoCodigo = gcrResolverCodigoAuto(viejo.base, codigos);
  } else {
    // Personalizado: no se puede rearmar solo, se pide el nuevo código.
    const entrada = prompt('Escribe el nuevo código de reemplazo:', '');
    if (entrada === null) return;
    nuevoCodigo = gcrLimpiarAlfanum(entrada);
    if (!nuevoCodigo) { alert('El código no puede estar vacío.'); return; }
    if (gcrCodigoExiste(nuevoCodigo, codigos)) { alert('Ese código ya existe. Usa otro.'); return; }
  }

  const ok = confirm(
    `Vas a desactivar ${viejo.codigo} y crear ${nuevoCodigo} para ${viejo.propietario.nombre}.\n\n` +
    `El cashback y los referidos se pasan al código nuevo. ¿Continuar?`
  );
  if (!ok) return;

  // El nuevo hereda todo (cashback, referidos, saldos, propietario).
  const nuevo = JSON.parse(JSON.stringify(viejo));
  nuevo.codigo = nuevoCodigo;
  nuevo.fechaCreacion = new Date().toISOString();
  nuevo.estado = 'activo';
  nuevo.reemplazaA = viejo.codigo;
  nuevo.reemplazadoPor = null;

  // El viejo queda desactivado, apuntando al nuevo.
  viejo.estado = 'desactivado';
  viejo.reemplazadoPor = nuevoCodigo;

  codigos.unshift(nuevo);
  gcrGuardarCodigos(codigos);

  gcrRenderLista();
  gcrBuscar(); // refresca la búsqueda actual
  alert(`Listo. Nuevo código: ${nuevoCodigo}`);
}

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE TODOS LOS CÓDIGOS
// ════════════════════════════════════════════════════════════════════════════

function gcrRenderLista() {
  const codigos = gcrLeerCodigos();
  const vacia = document.getElementById('gcr-lista-vacia');
  const wrap = document.getElementById('gcr-lista-wrap');
  const body = document.getElementById('gcr-lista-body');

  if (codigos.length === 0) {
    vacia.style.display = 'block';
    wrap.style.display = 'none';
    return;
  }

  vacia.style.display = 'none';
  wrap.style.display = 'block';

  body.innerHTML = codigos.map(c => `
    <tr class="${c.estado === 'desactivado' ? 'gcr-fila-desactivada' : ''}">
      <td><strong>${c.codigo}</strong></td>
      <td>${c.propietario.nombre}</td>
      <td><span class="gcr-badge gcr-badge--${c.estado}">${gcrEstadoLabel(c.estado)}</span></td>
      <td>${c.referidos}</td>
      <td>${gcrCOP(c.cashbackDisponible)}</td>
      <td>${gcrFecha(c.fechaCreacion)}</td>
    </tr>
  `).join('');
}

// ════════════════════════════════════════════════════════════════════════════
// COPIAR AL PORTAPAPELES
// ════════════════════════════════════════════════════════════════════════════

// Acepta un id de elemento (lee su texto) o directamente el texto a copiar.
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