// ===========================
// HEALTHCANVAS — main.js
// ===========================

// --- Menú hamburguesa ---
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  const isOpen = navLinks.classList.contains('active');
  navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
});

// Cerrar menú al hacer click en un enlace
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

// --- Cerrar menú al hacer click afuera ---
document.addEventListener('click', (e) => {
  if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
    navLinks.classList.remove('active');
  }
});

// --- Scroll suave al nav activo ---
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav__links a[href^="#"]');

const observerOptions = {
  rootMargin: '-40% 0px -55% 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(link => link.classList.remove('active'));
      const activeLink = document.querySelector(`.nav__links a[href="#${entry.target.id}"]`);
      if (activeLink) activeLink.classList.add('active');
    }
  });
}, observerOptions);

sections.forEach(section => observer.observe(section));

// --- Animación de entrada al hacer scroll ---
const animItems = document.querySelectorAll('.plan, .proyecto, .sobre-mi__texto, .sobre-mi__imagen');

const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

animItems.forEach(item => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';
  item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  animObserver.observe(item);
});

document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = '.visible { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);
});

// --- Toggle "Conoce cada funcionalidad de tu plan" (páginas de detalle) ---
const funcToggle = document.getElementById('funcToggle');
const funcPanel  = document.getElementById('funcPanel');
if (funcToggle && funcPanel) {
  funcToggle.addEventListener('click', () => {
    const expanded = funcToggle.getAttribute('aria-expanded') === 'true';
    funcToggle.setAttribute('aria-expanded', String(!expanded));
    funcPanel.hidden = expanded;
    const icono = funcToggle.querySelector('.sv-comparador__icono');
    if (icono) icono.style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
  });
}

// --- "Incluido en tu plan" para elementos sueltos (páginas de detalle) ---
const planDetalleInputs = document.querySelectorAll('input[name="planDetalle"]');
if (planDetalleInputs.length) {
  const INCLUIDOS = {
    'Sitio Esencial Básica': [],
    'Sitio Esencial Pro': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección testimonios', 'Diseño personalizado'],
    'Sitio Profesional Básica': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección testimonios', 'Diseño personalizado'],
    'Sitio Profesional Pro': ['Formulario de contacto', 'Diseño personalizado', 'Especialidades detalladas', 'PDFs descargables', 'Agendamiento con Calendly', 'Optimización para motores de búsqueda', 'Buscador de palabras', 'Animaciones de desplazamiento'],
    'Sitio con Chatbot Básica': ['Formulario de contacto', 'Animaciones de desplazamiento', 'Sección testimonios', 'Diseño personalizado', 'Sección de preguntas frecuentes', 'Chatbot básico', 'Especialidades detalladas', 'Agendamiento con Calendly'],
    'Sitio con Chatbot Pro': ['Formulario de contacto', 'Diseño personalizado', 'Especialidades detalladas', 'PDFs descargables', 'Agendamiento con Calendly', 'Optimización para motores de búsqueda', 'Buscador de palabras', 'Chatbot básico', 'Chatbot con IA', 'Asistente de agendamiento con IA', 'Sección de preguntas frecuentes', 'Animaciones de desplazamiento'],
  };

  function actualizarSueltosDetalle() {
    const plan = document.querySelector('input[name="planDetalle"]:checked');
    const incluidos = plan ? (INCLUIDOS[plan.value] || []) : [];

    document.querySelectorAll('.detalle__suelta-option').forEach(option => {
      const input = option.querySelector('input');
      const card = option.querySelector('.detalle__suelta');
      const precio = card.querySelector('span');
      const badgeViejo = card.querySelector('.badge-incluido');
      if (badgeViejo) badgeViejo.remove();
      option.classList.remove('is-incluido');

      if (incluidos.includes(input.value)) {
        input.checked = false;
        input.disabled = true;
        option.classList.add('is-incluido');
        if (precio) precio.style.display = 'none';
        const badge = document.createElement('span');
        badge.className = 'badge-incluido';
        badge.textContent = '✓ Incluido en tu plan';
        card.appendChild(badge);
      } else {
        input.disabled = false;
        if (precio) precio.style.display = '';
      }
    });
  }

  planDetalleInputs.forEach(i => i.addEventListener('change', actualizarSueltosDetalle));
  actualizarSueltosDetalle();
}

// --- "Continuar al cotizador" (páginas de detalle) ---
const continuarCotizador = document.getElementById('continuarCotizador');
if (continuarCotizador) {
  continuarCotizador.addEventListener('click', () => {
    const plan   = document.querySelector('input[name="planDetalle"]:checked');
    const addons = Array.from(document.querySelectorAll('.detalle__suelta-option input:checked')).map(i => i.value);
    const params = new URLSearchParams();
    if (plan) params.set('plan', plan.value);
    if (addons.length) params.set('addons', addons.join(','));
    window.location.href = `servicios.html?${params.toString()}#cotizador`;
  });
}