// ===========================
// SERVICIOS — servicios.js
// ===========================

const planInputs       = document.querySelectorAll('input[name="plan"]');
const extraInputs      = document.querySelectorAll('input[type="checkbox"]');
const tarjetaInputs    = document.querySelectorAll('input[name="tarjeta"]');
const postInputs       = document.querySelectorAll('input[name="post"]');
const resumenVacio     = document.querySelector('.cotizador__resumen-vacio');
const resumenContenido = document.getElementById('resumenContenido');
const resumenLista     = document.getElementById('resumenLista');
const resumenTotal     = document.getElementById('resumenTotal');
const btnWhatsapp      = document.getElementById('btnWhatsapp');

function formatCOP(valor) {
  return '$' + valor.toLocaleString('es-CO');
}

function actualizarCotizacion() {
  const planSeleccionado = document.querySelector('input[name="plan"]:checked');
  if (!planSeleccionado) {
    resumenVacio.style.display = 'block';
    resumenContenido.style.display = 'none';
    return;
  }

  resumenVacio.style.display = 'none';
  resumenContenido.style.display = 'block';

  const items = [];
  let total = 0;

  // Plan base
  const planPrecio = parseInt(planSeleccionado.dataset.precio);
  items.push({ nombre: planSeleccionado.value, precio: planPrecio });
  total += planPrecio;

  // Extras (checkboxes)
  extraInputs.forEach(input => {
    if (input.checked) {
      const precio = parseInt(input.dataset.precio);
      items.push({ nombre: input.value, precio });
      total += precio;
    }
  });

  // Tarjeta (toggle radio)
  const tarjetaSeleccionada = document.querySelector('input[name="tarjeta"]:checked');
  if (tarjetaSeleccionada) {
    const precio = parseInt(tarjetaSeleccionada.dataset.precio);
    items.push({ nombre: tarjetaSeleccionada.value, precio });
    total += precio;
  }

  // Post (toggle radio)
  const postSeleccionado = document.querySelector('input[name="post"]:checked');
  if (postSeleccionado) {
    const precio = parseInt(postSeleccionado.dataset.precio);
    items.push({ nombre: postSeleccionado.value, precio });
    total += precio;
  }

  // Renderizar
  resumenLista.innerHTML = items.map(item => `
    <li>
      <span>${item.nombre}</span>
      <span>${formatCOP(item.precio)}</span>
    </li>
  `).join('');

  resumenTotal.textContent = formatCOP(total) + ' est.';

  // WhatsApp
  const lineas = items
    .map(i => `• ${i.nombre}: ${formatCOP(i.precio)}`)
    .join('%0A');

  const mensaje =
    `Hola Ana María, vi tu página HealthCanvas y me interesa cotizar lo siguiente:%0A%0A` +
    `${lineas}%0A%0A` +
    `Total estimado: ${formatCOP(total)}%0A%0A` +
    `Quedo atento/a a tu respuesta 🙂`;

  btnWhatsapp.href = `https://wa.me/573167904921?text=${mensaje}`;
}

// Toggles tarjeta y post
document.getElementById('tarjetaHeader').addEventListener('click', () => {
  const opciones = document.getElementById('tarjetaOpciones');
  const header   = document.getElementById('tarjetaHeader');
  const abierto  = opciones.style.display === 'flex';
  opciones.style.display = abierto ? 'none' : 'flex';
  header.classList.toggle('is-open', !abierto);
});

document.getElementById('postHeader').addEventListener('click', () => {
  const opciones = document.getElementById('postOpciones');
  const header   = document.getElementById('postHeader');
  const abierto  = opciones.style.display === 'flex';
  opciones.style.display = abierto ? 'none' : 'flex';
  header.classList.toggle('is-open', !abierto);
});

// Escuchar todos los cambios
planInputs.forEach(i    => i.addEventListener('change', actualizarCotizacion));
extraInputs.forEach(i   => i.addEventListener('change', actualizarCotizacion));
tarjetaInputs.forEach(i => i.addEventListener('change', actualizarCotizacion));
postInputs.forEach(i    => i.addEventListener('change', actualizarCotizacion));

// Preseleccionar plan desde URL ?plan=X
const params    = new URLSearchParams(window.location.search);
const planParam = params.get('plan');
if (planParam) {
  const match = document.querySelector(`input[name="plan"][value="${planParam}"]`);
  if (match) {
    match.checked = true;
    actualizarCotizacion();
    setTimeout(() => {
      document.getElementById('cotizador')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
}