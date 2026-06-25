// ===========================
// MAIN — main.js
// Lógica global del sitio
// ===========================

// ── NAVEGACIÓN RESPONSIVE ───────────────────────────────────────────────────

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  // Cerrar menú al hacer clic en un link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });
}

// ── COMPARADOR DE PLANES ────────────────────────────────────────────────────

const comparadorToggle = document.getElementById('comparadorToggle');
const comparadorTabla = document.getElementById('comparadorTabla');

if (comparadorToggle) {
  comparadorToggle.addEventListener('click', () => {
    const isExpanded = comparadorToggle.getAttribute('aria-expanded') === 'true';
    comparadorToggle.setAttribute('aria-expanded', !isExpanded);
    comparadorToggle.classList.toggle('active');
    
    if (isExpanded) {
      comparadorTabla.setAttribute('hidden', '');
    } else {
      comparadorTabla.removeAttribute('hidden');
    }
  });
}

// ── TOGGLE DE LOGO, POST, TARJETA (en servicios.html) ─────────────────────

function initializeToggles() {
  const toggles = ['toggleLogo', 'togglePost', 'toggleTarjeta'];

  toggles.forEach(toggleId => {
    const toggleElement = document.getElementById(toggleId);
    if (!toggleElement) return;

    const header = document.getElementById(toggleId.replace('toggle', '') + 'Header');
    const opciones = document.getElementById(toggleId.replace('toggle', '') + 'Opciones');

    if (header && opciones) {
      header.addEventListener('click', () => {
        const isOpen = opciones.style.display !== 'none';
        opciones.style.display = isOpen ? 'none' : 'flex';
        header.classList.toggle('active');
      });
    }
  });
}

// ── BADGE DINÁMICO (ACTUALIZAR EN TIEMPO REAL) ──────────────────────────────

function actualizarBadgeCarrito() {
  const carrito = JSON.parse(localStorage.getItem('healthcanvasCarrito') || '[]');
  const badges = document.querySelectorAll('.nav__carrito-badge');

  badges.forEach(badge => {
    if (carrito.length > 0) {
      badge.textContent = carrito.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

// Actualizar badge cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
  actualizarBadgeCarrito();
  initializeToggles();

  // Listener para cambios en localStorage (en otra pestaña)
  window.addEventListener('storage', (e) => {
    if (e.key === 'healthcanvasCarrito') {
      actualizarBadgeCarrito();
    }
  });
});

// Actualizar badge cada segundo (para sincronización en tiempo real)
setInterval(actualizarBadgeCarrito, 1000);

// ── SCROLL SUAVE PARA ANCLAS ────────────────────────────────────────────────

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    
    if (href === '#') {
      e.preventDefault();
      return;
    }

    const targetElement = document.querySelector(href);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});