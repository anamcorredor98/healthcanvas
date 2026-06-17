// ===========================
// CONTACTO — contacto.js
// ===========================

const form = document.getElementById('ctForm');
const nota = document.getElementById('ctFormNota');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre       = document.getElementById('nombre').value.trim();
  const especialidad = document.getElementById('especialidad').value.trim();
  const email        = document.getElementById('email').value.trim();
  const whatsapp     = document.getElementById('whatsapp').value.trim();
  const plan         = document.getElementById('plan').value;
  const mensaje      = document.getElementById('mensaje').value.trim();

  // Mostrar enviando
  nota.textContent = 'Enviando...';
  nota.className = 'ct-form__nota';
  nota.style.display = 'block';

  try {
    // Enviar a Formspree
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre, especialidad, email, whatsapp,
        plan: plan || 'Por definir',
        mensaje
      })
    });

    if (response.ok) {
      // Confirmación
      nota.textContent = '✅ Mensaje enviado. Te redirigimos a WhatsApp para continuar la conversación...';
      nota.className = 'ct-form__nota ct-form__nota--ok';

      // Armar mensaje WhatsApp
      const planTexto = plan ? `Plan de interés: ${plan}` : 'Plan: Por definir';
      const wpTexto =
        `Hola Ana María, acabo de enviarte un formulario desde HealthCanvas 👋%0A%0A` +
        `*Nombre:* ${nombre}%0A` +
        `*Especialidad:* ${especialidad}%0A` +
        `*Email:* ${email}%0A` +
        (whatsapp ? `*WhatsApp:* ${whatsapp}%0A` : '') +
        `*${planTexto}*%0A%0A` +
        (mensaje ? `*Mensaje:* ${mensaje}` : '');

      setTimeout(() => {
        window.open(`https://wa.me/573167904921?text=${wpTexto}`, '_blank');
        form.reset();
        setTimeout(() => { nota.style.display = 'none'; }, 4000);
      }, 1500);

    } else {
      throw new Error('Error al enviar');
    }

  } catch (err) {
    nota.textContent = '❌ Hubo un error al enviar. Por favor escríbeme directo por WhatsApp.';
    nota.className = 'ct-form__nota ct-form__nota--error';
  }
});