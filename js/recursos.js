// recursos.js — compartido por guia-cotizacion.html, antes-de-contratar.html, guia-creacion-cuentas.html

document.addEventListener('DOMContentLoaded', () => {
  const btnVolver = document.getElementById('btnVolverContacto');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      window.location.href = 'contacto.html';
    });
  }
});