// ===========================
// LEGAL — legal.js
// Toggle de "Ver texto legal completo" en Términos y Política de Privacidad
// ===========================

document.querySelectorAll('.lg-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const target = document.getElementById(targetId);
    if (!target) return;

    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    target.hidden = expanded;

    const label = btn.querySelector('.lg-toggle__texto');
    if (label) {
      label.textContent = expanded ? 'Ver texto legal completo' : 'Ocultar texto legal completo';
    }
  });
});