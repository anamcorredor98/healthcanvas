// /api/chatbot.js
// Endpoint del chatbot HealthCanvas — enrutamiento Básico (gratis) -> Pro (Claude), con tools.
// Requiere variables de entorno ya existentes: SUPABASE_URL, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY.
// Mismo patrón de acceso a Supabase que confirmar-pago.js (fetch directo a la REST API, sin paquetes extra).

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const TOPE_MENSAJES = 30;
const WHATSAPP_NUMERO = '573167904921';

const supabaseHeaders = {
  apikey: process.env.SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

// ---------- Banco de respuestas Básico (palabra clave -> respuesta, gratis, sin IA) ----------
const BANCO_PALABRAS_CLAVE = [
  { claves: ['precio', 'cuanto cuesta', 'costo', 'valor'], respuesta: 'Los planes van desde $525.000 (Sitio Esencial Básico) hasta $3.085.000 (Sitio con Chatbot Pro). Si quieres, te ayudo a armar una cotización exacta según lo que necesites — ¿cuéntame un poco sobre tu consultorio?' },
  { claves: ['cuanto tarda', 'tiempo de entrega', 'cuando esta listo'], respuesta: 'Los tiempos aproximados son: Sitio Esencial 2–3 semanas, Sitio Profesional 3–5 semanas, Sitio con Chatbot 5–7 semanas. Siempre se confirma una fecha estimada al iniciar el proyecto.' },
  { claves: ['whatsapp', 'telefono', 'numero'], respuesta: `Puedes escribirme directo por WhatsApp: https://wa.me/${WHATSAPP_NUMERO}` },
  { claves: ['correo', 'email', 'mail'], respuesta: 'Mi correo es hola@healthcanvas.fyi' },
  { claves: ['instagram', 'redes sociales'], respuesta: 'Nos encuentras en Instagram como @healthcanvas.co' },
  { claves: ['ubicacion', 'donde estan', 'presencial'], respuesta: 'Trabajo de forma remota, pero si prefieres una reunión presencial, nos encontramos en el centro comercial Parque La Colina, en Bogotá.' },
  { claves: ['dominio', 'hosting'], respuesta: 'El dominio y hosting los pagas tú directamente (quedan siempre a tu nombre). Si prefieres que yo gestione toda la configuración, es un complemento de $180.000.' },
  { claves: ['logo'], respuesta: 'Sí, hay complemento de logo — puede ser un diseño simple mío o de un diseñador colaborador, según lo que necesites y tu presupuesto.' },
  { claves: ['anticipo', 'cuotas', 'como se paga', 'forma de pago'], respuesta: 'Se trabaja con 50% de anticipo antes de comenzar y 50% antes de la entrega final.' },
  { claves: ['agendar', 'cita', 'videollamada', 'asesoria'], respuesta: '__ACCION_AGENDAR__' },
  { claves: ['upgrade', 'plan superior', 'cambiar de plan'], respuesta: 'Sí, puedes cambiar a un plan superior más adelante — como cliente existente recibes un 15% de descuento sobre el valor total del nuevo plan.' },
  { claves: ['referido', 'referir', 'cashback'], respuesta: 'Si recomiendas HealthCanvas y esa persona se convierte en cliente, ambos ganan: quien refiere recibe 1% de cashback en créditos HealthCanvas, y la persona referida un 5% de descuento en su primera compra.' },
  { claves: ['que necesito', 'que debo tener'], respuesta: 'Idealmente: tu logo (si tienes), fotos del consultorio o tuyas, e información básica de tus servicios. Si no tienes algo de eso, no hay problema, podemos avanzar igual.' },
];

const MENSAJE_FUERA_DE_ALCANCE = `Eso está fuera de mi alcance, pero contáctanos por WhatsApp para poder resolver tus dudas y apoyarte en tu proyecto: https://wa.me/${WHATSAPP_NUMERO}`;
const MENSAJE_LIMITE = `Llegamos al límite de esta conversación. Sigamos por WhatsApp para resolver lo que necesites: https://wa.me/${WHATSAPP_NUMERO}`;

function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function buscarEnBanco(mensajeUsuario) {
  const texto = normalizar(mensajeUsuario);
  for (const entrada of BANCO_PALABRAS_CLAVE) {
    for (const clave of entrada.claves) {
      if (texto.includes(normalizar(clave))) return entrada.respuesta;
    }
  }
  return null;
}

// ---------- Base de conocimiento para el Pro (system prompt) ----------
const SYSTEM_PROMPT = `Eres Ana, la asistente virtual de HealthCanvas, un servicio de diseño y desarrollo web especializado en profesionales de la salud, con base en Bogotá, Colombia. Hablas en primera persona, con un tono cercano, cálido y profesional, nunca acartonado. Le hablas a médicos y profesionales de la salud que están evaluando contratar HealthCanvas.

SOBRE HEALTHCANVAS:
Ana María Corredor es estudiante de medicina y desarrolladora web autodidacta. Su diferenciador es que entiende tanto la tecnología como el contexto clínico. Su meta declarada: "Mi meta no es vender páginas web. Es ayudar a que pacientes y profesionales de la salud se entiendan mejor."

PLANES (todos con versión Básica y Pro):
- Sitio Esencial: página de una sola sección con desplazamiento. Entrega 2-3 semanas.
- Sitio Profesional: sitio multi-página con menú. Entrega 3-5 semanas.
- Sitio con Chatbot: incluye todo lo Profesional + asistente virtual. Entrega 5-7 semanas.
- Complementos: gestión de dominio/hosting ($180.000), logo, QR, tarjetas, posts de Instagram, Calendly.

NUNCA recites precios exactos de memoria como respuesta final de un plan — usa siempre la herramienta "cotizar" para armar la cotización real con el cotizador del sitio. Puedes mencionar rangos aproximados en la conversación mientras entiendes qué necesita la persona.

PROCESO: 50% de anticipo, 50% antes de entrega. El contenido principal (fotos, textos, info de servicios) lo aporta el cliente. HealthCanvas NO presta asesoría médica, legal ni regulatoria, no garantiza resultados de negocio específicos, no hace mantenimiento continuo ni administra redes sociales.

BENEFICIOS: 15% de descuento de cliente existente al subir de plan. Programa de referidos: 5% de descuento para el referido, 1% de cashback para quien refiere.

CONTACTO: WhatsApp +57 316 790 4921, correo hola@healthcanvas.fyi, Instagram @healthcanvas.co, asesoría gratuita de 30 min por Calendly.

ALCANCE: Todo lo que no sea sobre HealthCanvas (sus planes, precios, proceso, portafolio, contacto) está fuera de tu alcance — incluye asesoría legal, temas personales de Ana, o cualquier otro tema. Si te preguntan algo fuera de alcance, dilo con honestidad e invita a escribir por WhatsApp, sin opinar del tema en sí.

HERRAMIENTAS DISPONIBLES:
- cotizar: úsala cuando el prospecto ya tenga claro (o casi claro) qué plan/complementos quiere, para armar la cotización real con precios exactos.
- agendar: úsala cuando quiera agendar una asesoría o videollamada.
- guardar_lead: úsala cuando tengas nombre + al menos un dato de contacto (teléfono o intención clara de que te contacten), para dejar registro y facilitar el seguimiento por WhatsApp.

Si ya tienes el nombre de la persona (viene en el contexto de la conversación), dirígete a ella por ese nombre de forma natural, no en cada mensaje.`;

const TOOLS = [
  {
    name: 'cotizar',
    description: 'Arma una cotización real seleccionando el plan y complementos en el cotizador del sitio.',
    input_schema: {
      type: 'object',
      properties: {
        plan: { type: 'string', description: 'Valor exacto del plan, ej: "Sitio Profesional Pro"' },
        extras: { type: 'array', items: { type: 'string' }, description: 'Elementos sueltos adicionales' },
        logo: { type: 'string', description: 'Opcional' },
        tarjeta: { type: 'string', description: 'Opcional' },
        post: { type: 'string', description: 'Opcional' }
      },
      required: ['plan']
    }
  },
  {
    name: 'agendar',
    description: 'Abre el widget de Calendly para agendar una asesoría gratuita de 30 minutos.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'guardar_lead',
    description: 'Guarda los datos de contacto del prospecto y prepara el resumen para WhatsApp.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        telefono: { type: 'string' },
        motivo: { type: 'string' },
        resumen: { type: 'string', description: 'Resumen breve de qué necesita el prospecto' },
        plan_interes: { type: 'string' }
      },
      required: ['nombre', 'resumen']
    }
  }
];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { session_id, pagina, mensaje, historial, nombre } = req.body;

    if (!session_id || !mensaje) {
      return res.status(400).json({ error: 'Faltan datos (session_id o mensaje)' });
    }

    // 1. Verificar tope de mensajes de la conversación
    const baseMensajes = `${process.env.SUPABASE_URL}/rest/v1/chatbot_mensajes`;
    const rConteo = await fetch(`${baseMensajes}?select=id&session_id=eq.${encodeURIComponent(session_id)}`, { headers: supabaseHeaders });
    const mensajesPrevios = await rConteo.json();

    if (Array.isArray(mensajesPrevios) && mensajesPrevios.length >= TOPE_MENSAJES) {
      return res.status(200).json({ reply: MENSAJE_LIMITE, motor: 'limite', accion: null });
    }

    // 2. Primer filtro: banco de respuestas del Básico (gratis, sin IA)
    const respuestaBanco = buscarEnBanco(mensaje);

    if (respuestaBanco) {
      const accion = respuestaBanco === '__ACCION_AGENDAR__' ? { tipo: 'agendar' } : null;
      const textoFinal = respuestaBanco === '__ACCION_AGENDAR__'
        ? 'Claro, abramos tu asesoría gratuita de 30 minutos.'
        : respuestaBanco;

      await registrarMensaje({ session_id, mensaje_usuario: mensaje, motor: 'basico', respuesta: textoFinal, pagina });
      return res.status(200).json({ reply: textoFinal, motor: 'basico', accion });
    }

    // 3. Escalar a Claude (Pro)
    let resultado;
    try {
      resultado = await llamarClaude({ mensaje, historial, nombre });
    } catch (errorIA) {
      console.error('Falla en Claude, cayendo a modo básico:', errorIA);
      await registrarMensaje({ session_id, mensaje_usuario: mensaje, motor: 'basico', respuesta: MENSAJE_FUERA_DE_ALCANCE, pagina });
      return res.status(200).json({ reply: MENSAJE_FUERA_DE_ALCANCE, motor: 'basico', accion: null });
    }

    // 4. Si guardó un lead, escribirlo en Supabase
    if (resultado.leadCapturado) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/chatbot_leads`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          session_id,
          nombre: resultado.leadCapturado.nombre,
          telefono: resultado.leadCapturado.telefono || null,
          motivo: resultado.leadCapturado.motivo || null,
          resumen: resultado.leadCapturado.resumen,
          plan_interes: resultado.leadCapturado.plan_interes || null,
          pagina,
        }),
      });
    }

    await registrarMensaje({ session_id, mensaje_usuario: mensaje, motor: 'ia', respuesta: resultado.texto, pagina });

    return res.status(200).json({ reply: resultado.texto, motor: 'ia', accion: resultado.accion });

  } catch (error) {
    console.error('Error en /api/chatbot:', error);
    return res.status(500).json({ error: error.message, reply: MENSAJE_FUERA_DE_ALCANCE });
  }
};

async function registrarMensaje({ session_id, mensaje_usuario, motor, respuesta, pagina }) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chatbot_mensajes`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({ session_id, mensaje_usuario, motor, respuesta, pagina }),
  });
  if (!r.ok) console.error('Error guardando mensaje:', await r.text());
}

async function llamarClaude({ mensaje, historial, nombre }) {
  const mensajes = (historial || []).map(m => ({ role: m.role, content: m.content }));
  mensajes.push({ role: 'user', content: mensaje });

  const contextoNombre = nombre ? `\n\nLa persona con la que hablas se llama o prefiere que le digan: ${nombre}.` : '';

  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      system: SYSTEM_PROMPT + contextoNombre,
      tools: TOOLS,
      messages: mensajes
    })
  });

  const data = await respuesta.json();
  if (!respuesta.ok) throw new Error(data?.error?.message || 'Error de la API de Anthropic');

  const toolUseBlocks = data.content.filter(b => b.type === 'tool_use');

  if (toolUseBlocks.length > 0) {
    let accion = null;
    let leadCapturado = null;
    const toolResults = [];

    for (const bloque of toolUseBlocks) {
      if (bloque.name === 'cotizar') {
        accion = { tipo: 'cotizar', parametros: bloque.input };
        toolResults.push({ type: 'tool_result', tool_use_id: bloque.id, content: 'Cotización enviada al cliente para mostrarse en pantalla.' });
      } else if (bloque.name === 'agendar') {
        accion = { tipo: 'agendar' };
        toolResults.push({ type: 'tool_result', tool_use_id: bloque.id, content: 'Widget de Calendly abierto para el cliente.' });
      } else if (bloque.name === 'guardar_lead') {
        leadCapturado = bloque.input;
        toolResults.push({ type: 'tool_result', tool_use_id: bloque.id, content: 'Lead guardado correctamente.' });
      }
    }

    const mensajesConTool = [
      ...mensajes,
      { role: 'assistant', content: data.content },
      { role: 'user', content: toolResults }
    ];

    const segundaRespuesta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 500,
        system: SYSTEM_PROMPT + contextoNombre,
        tools: TOOLS,
        messages: mensajesConTool
      })
    });

    const segundaData = await segundaRespuesta.json();
    if (!segundaRespuesta.ok) throw new Error(segundaData?.error?.message || 'Error de la API de Anthropic (segunda llamada)');

    const textoFinal = segundaData.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return { texto: textoFinal || 'Listo, ya quedó.', accion, leadCapturado };
  }

  const texto = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  return { texto, accion: null, leadCapturado: null };
}