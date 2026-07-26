/* ===========================
   HEALTHCANVAS — chatbot.js  (guardar como js/chatbot.js en tu proyecto)
   Widget del chatbot: burbuja flotante (todo el sitio) + versión embebida (demo en "Así se ve").
   Vanilla JS, sin dependencias. Se conecta a /api/chatbot.
   =========================== */

(function () {
  'use strict';

  const ENDPOINT = '/api/chatbot-claude';
  const VENTANA_INACTIVIDAD_MS = 24 * 60 * 60 * 1000; // 24h
  const WHATSAPP_NUMERO = '573167904921';
  const CALENDLY_URL = 'https://calendly.com/anamariacorredor98/30min';
  const MENSAJE_APERTURA = 'Hola, soy Ana, tu asistente virtual de HealthCanvas 👋 ¿Cómo prefieres que te llame? Cuéntame en qué te puedo ayudar.';

  // ---------- Utilidades ----------

  function generarId() {
    return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function escaparHtml(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  function formatearMensajeBot(texto) {
    return escaparHtml(texto).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function paginaActual() {
    const parte = window.location.pathname.split('/').pop();
    return parte && parte.length ? parte : 'index.html';
  }

  // ---------- Estado / sesión (localStorage) ----------

  function crearEstado(prefijo) {
    const K = {
      session: prefijo + '_session_id',
      historial: prefijo + '_historial',
      nombre: prefijo + '_nombre',
      actividad: prefijo + '_actividad',
    };

    function cargar() {
      const ultimaActividad = parseInt(localStorage.getItem(K.actividad) || '0', 10);
      const vencida = !ultimaActividad || (Date.now() - ultimaActividad) > VENTANA_INACTIVIDAD_MS;

      if (vencida || !localStorage.getItem(K.session)) {
        localStorage.setItem(K.session, generarId());
        localStorage.setItem(K.historial, JSON.stringify([]));
        localStorage.removeItem(K.nombre);
        localStorage.setItem(K.actividad, String(Date.now()));
      }

      return {
        sessionId: localStorage.getItem(K.session),
        historial: JSON.parse(localStorage.getItem(K.historial) || '[]'),
        nombre: localStorage.getItem(K.nombre) || null,
      };
    }

    function guardarHistorial(historial) {
      localStorage.setItem(K.historial, JSON.stringify(historial));
      localStorage.setItem(K.actividad, String(Date.now()));
    }

    function guardarNombre(nombre) {
      localStorage.setItem(K.nombre, nombre);
      localStorage.setItem(K.actividad, String(Date.now()));
    }

    return { cargar, guardarHistorial, guardarNombre };
  }

  // ---------- Acción: cotizar (llena el cotizador real de servicios.html) ----------

  function seleccionarValorEnGrupo(name, valorBuscado) {
    document.querySelectorAll('input[name="' + name + '"]').forEach((input) => {
      if (input.value === valorBuscado) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function seleccionarCheckboxPorValor(valorBuscado) {
    document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      if (input.value === valorBuscado) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  function seleccionarEnCotizador(parametros) {
    if (parametros.plan) seleccionarValorEnGrupo('plan', parametros.plan);
    (parametros.extras || []).forEach(seleccionarCheckboxPorValor);
    if (parametros.logo) seleccionarValorEnGrupo('logo', parametros.logo);
    if (parametros.tarjeta) seleccionarValorEnGrupo('tarjeta', parametros.tarjeta);
    if (parametros.post) seleccionarValorEnGrupo('post', parametros.post);
    const cotizadorEl = document.getElementById('cotizador');
    if (cotizadorEl) cotizadorEl.scrollIntoView({ behavior: 'smooth' });
  }

  function aplicarCotizacion(parametros) {
    if (document.getElementById('cotizador')) {
      seleccionarEnCotizador(parametros);
    } else {
      // No estamos en servicios.html: guardamos la selección y navegamos ahí.
      localStorage.setItem('hc_cotizacion_pendiente', JSON.stringify(parametros));
      window.location.href = 'servicios.html#cotizador';
    }
  }

  // Al cargar cualquier página, si hay una cotización pendiente y estamos en servicios.html, se aplica.
  document.addEventListener('DOMContentLoaded', () => {
    const pendiente = localStorage.getItem('hc_cotizacion_pendiente');
    if (pendiente && document.getElementById('cotizador')) {
      localStorage.removeItem('hc_cotizacion_pendiente');
      try { seleccionarEnCotizador(JSON.parse(pendiente)); } catch (e) { /* ignorar */ }
    }
  });

  // ---------- Acción: agendar (popup de Calendly) ----------

  let calendlyPromesa = null;
  function cargarCalendly() {
    if (window.Calendly) return Promise.resolve();
    if (calendlyPromesa) return calendlyPromesa;
    calendlyPromesa = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
    return calendlyPromesa;
  }

  function abrirCalendly() {
    cargarCalendly().then(() => {
      if (window.Calendly) window.Calendly.initPopupWidget({ url: CALENDLY_URL });
    });
  }

  // ---------- Llamada al backend ----------

  async function enviarMensaje({ sessionId, mensaje, historial, nombre, pagina }) {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, pagina, mensaje, historial, nombre }),
    });
    if (!r.ok) throw new Error('Error del servidor');
    return r.json();
  }

  // ---------- Construcción del DOM del widget ----------

  const ICONO_BURBUJA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  function construirDOM(inline) {
    const wrap = document.createElement('div');
    wrap.className = 'hc-chat-wrap' + (inline ? ' hc-chat-wrap--inline' : '');

    wrap.innerHTML = `
      <button class="hc-chat-bubble" type="button" aria-label="Abrir chat de HealthCanvas">${ICONO_BURBUJA}</button>
      <div class="hc-chat-panel${inline ? ' hc-chat-panel--abierto' : ''}">
        <div class="hc-chat-header">
          <span>Ana · HealthCanvas</span>
          <button class="hc-chat-cerrar" type="button" aria-label="Cerrar chat">×</button>
        </div>
        <div class="hc-chat-mensajes"></div>
        <div class="hc-chat-botones-rapidos"></div>
        <form class="hc-chat-input-row">
          <input type="text" name="mensaje" autocomplete="off" placeholder="Escribe tu mensaje..." />
          <button type="submit">Enviar</button>
        </form>
      </div>
    `;

    if (inline) {
      wrap.querySelector('.hc-chat-cerrar').style.display = 'none';
    }

    return {
      el: wrap,
      bubble: wrap.querySelector('.hc-chat-bubble'),
      panel: wrap.querySelector('.hc-chat-panel'),
      cerrar: wrap.querySelector('.hc-chat-cerrar'),
      mensajes: wrap.querySelector('.hc-chat-mensajes'),
      botonesRapidos: wrap.querySelector('.hc-chat-botones-rapidos'),
      form: wrap.querySelector('.hc-chat-input-row'),
      input: wrap.querySelector('.hc-chat-input-row input'),
    };
  }

  function agregarMensajeUI(ui, tipo, texto) {
    const div = document.createElement('div');
    div.className = 'hc-chat-msg hc-chat-msg--' + tipo;
    div.innerHTML = tipo === 'bot' ? formatearMensajeBot(texto) : escaparHtml(texto);
    ui.mensajes.appendChild(div);
    ui.mensajes.scrollTop = ui.mensajes.scrollHeight;
  }

  function mostrarEscribiendo(ui, mostrar) {
    let indicador = ui.mensajes.querySelector('.hc-chat-escribiendo');
    if (mostrar && !indicador) {
      indicador = document.createElement('div');
      indicador.className = 'hc-chat-escribiendo';
      indicador.innerHTML = '<span></span><span></span><span></span>';
      ui.mensajes.appendChild(indicador);
      ui.mensajes.scrollTop = ui.mensajes.scrollHeight;
    } else if (!mostrar && indicador) {
      indicador.remove();
    }
  }

  const BOTONES_RAPIDOS = [
    { texto: 'Planes y precios', mensaje: '¿Cuáles son tus planes y precios?' },
    { texto: '¿Cómo funciona el proceso?', mensaje: '¿Cómo funciona tu proceso de trabajo?' },
    { texto: 'Agendar una asesoría', mensaje: 'Quiero agendar una asesoría' },
    { texto: 'Ver ejemplos reales', mensaje: '¿Puedo ver ejemplos de trabajo real?' },
  ];

  function mostrarBotonesRapidos(ui, onClick) {
    ui.botonesRapidos.innerHTML = '';
    BOTONES_RAPIDOS.forEach((b) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'hc-chat-boton-rapido';
      boton.textContent = b.texto;
      boton.addEventListener('click', () => onClick(b.mensaje));
      ui.botonesRapidos.appendChild(boton);
    });
  }

  // ---------- Lógica principal por instancia ----------

  function activarInteracciones(ui, estadoApi, inline) {
    function alternarPanel() {
      ui.panel.classList.toggle('hc-chat-panel--abierto');
    }

    if (!inline) {
      ui.bubble.addEventListener('click', alternarPanel);
      ui.cerrar.addEventListener('click', alternarPanel);
    }

    async function procesarEnvio(texto) {
      const limpio = texto.trim();
      if (!limpio) return;

      agregarMensajeUI(ui, 'user', limpio);
      ui.botonesRapidos.innerHTML = '';

      const datos = estadoApi.cargar();

      // Primer mensaje de una sesión nueva: se interpreta como el nombre (gratis, sin backend).
      if (!datos.nombre && datos.historial.length === 0) {
        estadoApi.guardarNombre(limpio);
        const saludo = 'Un gusto, ' + limpio + ' 😊 ¿en qué te puedo ayudar?';
        agregarMensajeUI(ui, 'bot', saludo);
        estadoApi.guardarHistorial([
          { role: 'user', content: limpio },
          { role: 'assistant', content: saludo },
        ]);
        mostrarBotonesRapidos(ui, procesarEnvio);
        return;
      }

      mostrarEscribiendo(ui, true);
      try {
        const data = await enviarMensaje({
          sessionId: datos.sessionId,
          mensaje: limpio,
          historial: datos.historial,
          nombre: datos.nombre,
          pagina: paginaActual(),
        });

        mostrarEscribiendo(ui, false);
        agregarMensajeUI(ui, 'bot', data.reply);

        const historialActualizado = datos.historial.concat([
          { role: 'user', content: limpio },
          { role: 'assistant', content: data.reply },
        ]);
        estadoApi.guardarHistorial(historialActualizado);

        if (data.accion && data.accion.tipo === 'cotizar') aplicarCotizacion(data.accion.parametros || {});
        if (data.accion && data.accion.tipo === 'agendar') abrirCalendly();
      } catch (error) {
        mostrarEscribiendo(ui, false);
        agregarMensajeUI(ui, 'bot', 'Uy, algo falló de mi lado. Escríbeme directo por WhatsApp: https://wa.me/' + WHATSAPP_NUMERO);
      }
    }

    ui.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = ui.input.value;
      ui.input.value = '';
      procesarEnvio(texto);
    });

    // Restaurar conversación o mostrar saludo inicial.
    const datos = estadoApi.cargar();
    if (datos.historial.length === 0 && !datos.nombre) {
      agregarMensajeUI(ui, 'bot', MENSAJE_APERTURA);
    } else {
      datos.historial.forEach((m) => agregarMensajeUI(ui, m.role === 'user' ? 'user' : 'bot', m.content));
      if (datos.nombre) mostrarBotonesRapidos(ui, procesarEnvio);
    }
  }

  // ---------- API pública ----------

  function ajustarPosicionBurbuja(wrap) {
    const footer = document.querySelector('.footer');
    const margen = 20; // mismo margen que el "right" en chatbot.css
    if (!footer) { wrap.style.bottom = margen + 'px'; return; }

    const rectFooter = footer.getBoundingClientRect();
    const solapado = window.innerHeight - rectFooter.top; // > 0 cuando el footer ya invade la parte baja de la pantalla

    wrap.style.bottom = (solapado > 0 ? solapado + margen : margen) + 'px';
  }

  function montarBurbuja() {
    if (document.querySelector('.hc-chat-wrap:not(.hc-chat-wrap--inline)')) return;
    const ui = construirDOM(false);
    document.body.appendChild(ui.el);
    activarInteracciones(ui, crearEstado('hc_chat'), false);

    let pendiente = false;
    function actualizarPosicion() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        ajustarPosicionBurbuja(ui.el);
        pendiente = false;
      });
    }

    actualizarPosicion();
    window.addEventListener('scroll', actualizarPosicion, { passive: true });
    window.addEventListener('resize', actualizarPosicion);
  }

  function montarInline(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;
    const ui = construirDOM(true);
    contenedor.appendChild(ui.el);
    activarInteracciones(ui, crearEstado('hc_chat_demo'), true);
  }

  window.HCChatbot = { montarBurbuja, montarInline };

  document.addEventListener('DOMContentLoaded', montarBurbuja);
})();