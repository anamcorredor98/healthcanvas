// ===========================
// DETALLE DE PLAN — detalle.js
// Usado en landing-page.html, sitio-profesional.html, sitio-chatbot.html
// ===========================

// ── Elementos sueltos que YA vienen incluidos en cada plan Pro ─────────────
// (el valor debe coincidir exactamente con el value="" del checkbox de esa página)
const INCLUIDOS_PRO = {
  'Sitio Esencial Pro': [
    'Formulario de contacto',
    'Animaciones de desplazamiento',
    'Sección de testimonios',
    'Diseño personalizado',
  ],
  'Sitio Profesional Pro': [
    'Sección de especialidades detalladas',
    'Agendamiento con Calendly',
    'Optimización para motores de búsqueda',
    'Buscador de palabras',
  ],
  'Sitio con Chatbot Pro': [
    'Optimización para motores de búsqueda',
    'Buscador de palabras',
    'Chatbot con IA',
    'Asistente de agendamiento con IA',
  ],
};

// ── Dependencias entre elementos sueltos ────────────────────────────────────
// (qué necesita tener el cliente antes de poder agregar cada elemento)
const REQUISITOS_SUELTOS = {
  'Asistente de agendamiento con IA': ['Chatbot con IA'],
};

// ── TOGGLE: "Conoce cada funcionalidad de tu plan" ──────────────────────────
const funcToggle = document.getElementById('funcToggle');
const funcPanel  = document.getElementById('funcPanel');

if (funcToggle && funcPanel) {
  funcToggle.addEventListener('click', () => {
    const abierto = funcToggle.getAttribute('aria-expanded') === 'true';
    funcToggle.setAttribute('aria-expanded', String(!abierto));
    funcToggle.classList.toggle('active');

    if (abierto) {
      funcPanel.setAttribute('hidden', '');
    } else {
      funcPanel.removeAttribute('hidden');
    }
  });
}

// ── BÁSICO / PRO: bloquear elementos sueltos ya incluidos en el Pro ─────────
const planInputsDetalle = document.querySelectorAll('input[name="planDetalle"]');
const sueltosInputs     = document.querySelectorAll('.detalle__suelta-option input[type="checkbox"]');

function actualizarSueltos() {
  const planSeleccionado = document.querySelector('input[name="planDetalle"]:checked');
  const incluidos = planSeleccionado ? (INCLUIDOS_PRO[planSeleccionado.value] || []) : [];

  // ¿Este valor ya está disponible? (incluido en el plan, o marcado y habilitado)
  function estaDisponible(valor) {
    if (incluidos.includes(valor)) return true;
    const input = Array.from(sueltosInputs).find(i => i.value === valor);
    return input ? (input.checked && !input.disabled) : false;
  }

  sueltosInputs.forEach(input => {
    const opcion = input.closest('.detalle__suelta-option');
    const card   = opcion.querySelector('.detalle__suelta');

    // Limpiar estado visual previo
    const badgeViejo = card.querySelector('.badge-incluido, .badge-requisito');
    if (badgeViejo) badgeViejo.remove();
    opcion.classList.remove('is-incluido', 'is-bloqueado');

    const esIncluido = incluidos.includes(input.value);
    const requisitos = REQUISITOS_SUELTOS[input.value] || [];
    const faltantes  = requisitos.filter(req => !estaDisponible(req));

    if (esIncluido) {
      input.checked = false;
      input.disabled = true;
      opcion.classList.add('is-incluido');

      const badge = document.createElement('span');
      badge.className = 'badge-incluido';
      badge.textContent = '✓ Incluido en tu plan';
      card.appendChild(badge);
    } else if (faltantes.length > 0) {
      input.checked = false;
      input.disabled = true;
      opcion.classList.add('is-bloqueado');

      const badge = document.createElement('span');
      badge.className = 'badge-requisito';
      badge.textContent = `Agrega: ${faltantes.join(', ')}`;
      card.appendChild(badge);
    } else {
      input.disabled = false;
    }
  });
}

planInputsDetalle.forEach(input => input.addEventListener('change', actualizarSueltos));
sueltosInputs.forEach(input => input.addEventListener('change', actualizarSueltos));
document.addEventListener('DOMContentLoaded', actualizarSueltos);


// ── BOTÓN "Continuar al cotizador" ──────────────────────────────────────────
const btnContinuar = document.getElementById('continuarCotizador');

if (btnContinuar) {
  btnContinuar.addEventListener('click', () => {
    const planSeleccionado = document.querySelector('input[name="planDetalle"]:checked');
    const params = new URLSearchParams();

    if (planSeleccionado) {
      params.set('plan', planSeleccionado.value);
    }

    // Solo se envían los sueltos elegidos manualmente (no los ya incluidos/deshabilitados)
    const addonsSeleccionados = Array.from(sueltosInputs)
      .filter(input => input.checked && !input.disabled)
      .map(input => input.value);

    if (addonsSeleccionados.length > 0) {
      params.set('addons', addonsSeleccionados.join(','));
    }

    window.location.href = `servicios.html?${params.toString()}#cotizador`;
  });
}