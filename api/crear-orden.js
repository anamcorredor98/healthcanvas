// api/crear-orden.js
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const baseCompras = `${process.env.SUPABASE_URL}/rest/v1/compras`;

  try {
    const { modo, pagador } = req.body;
    let compraData;

    if (modo === 'link') {
      compraData = await construirDesdeLink(req.body, headers);
    } else if (modo === 'directo') {
      compraData = await construirDesdeDirecto(req.body, headers);
    } else {
      return res.status(400).json({ error: 'Falta indicar el modo (link o directo).' });
    }

    if (compraData.error) {
      return res.status(compraData.status || 400).json({ error: compraData.error });
    }

    const datosPagador = {
      pagador_es_diferente: pagador?.esDiferente || false,
      pagador_nombre: pagador?.esDiferente ? (pagador.nombre || null) : null,
      pagador_email: pagador?.esDiferente ? (pagador.email || null) : null,
      pagador_telefono: pagador?.esDiferente ? (pagador.telefono || null) : null,
    };

    const rCrear = await fetch(baseCompras, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        ...compraData,
        ...datosPagador,
        estado: 'pendiente',
        fecha_creacion: new Date().toISOString(),
      }),
    });
    const creada = (await rCrear.json())[0];

    // Firma de integridad según la documentación de Bold:
    // SHA256 de {identificador}{monto}{divisa}{llave_secreta}, en ese orden exacto.
    const cadena = `${creada.orden_id}${creada.monto_a_pagar}COP${process.env.BOLD_LLAVE_SECRETA}`;
    const firmaIntegridad = crypto.createHash('sha256').update(cadena).digest('hex');

    return res.status(201).json({
      ordenId: creada.orden_id,
      monto: creada.monto_a_pagar,
      moneda: 'COP',
      descripcion: 'Compra HealthCanvas',
      firma: firmaIntegridad,
      llavePublica: process.env.BOLD_LLAVE_IDENTIDAD,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

async function construirDesdeLink(body, headers) {
  const { linkId } = body;
  if (!linkId) return { error: 'Falta el linkId.', status: 400 };

  const base = `${process.env.SUPABASE_URL}/rest/v1/links_privados`;
  const rLink = await fetch(`${base}?select=*&link_id=eq.${encodeURIComponent(linkId)}`, { headers });
  const link = (await rLink.json())[0];

  if (!link) return { error: 'No se encontró el link.', status: 404 };
  if (link.estado !== 'valido') return { error: 'Este link no está disponible para pago.', status: 400 };
  if (link.fecha_expiracion && new Date(link.fecha_expiracion) < new Date()) {
    return { error: 'Este link ya expiró.', status: 400 };
  }

  return {
    link_id: link.link_id,
    cliente_nombre: link.cliente_nombre,
    cliente_email: link.cliente_email,
    cliente_telefono: link.cliente_telefono,
    carrito: link.carrito || [],
    extras: link.extras || [],
    codigo_aplicado: null,
    tipo_codigo: null,
    totales: link.totales || {},
    monto_a_pagar: link.monto_a_pagar,
  };
}

async function construirDesdeDirecto(body, headers) {
  const { cliente, carrito, codigo } = body;

  if (!cliente?.nombre || !cliente?.email || !cliente?.telefono) {
    return { error: 'Completa los datos del cliente.', status: 400 };
  }
  if (!carrito || carrito.length === 0) {
    return { error: 'El carrito está vacío.', status: 400 };
  }

  const subtotal = carrito.reduce((sum, item) => sum + item.precio, 0);
  const iva = 0;

  let descuento = 0;
  let codigoAplicado = null;
  let tipoCodigo = null;

  if (codigo) {
    const validacion = await validarCodigoInterno(codigo, cliente, carrito, headers);
    if (validacion.valido) {
      codigoAplicado = codigo.trim().toUpperCase();
      tipoCodigo = validacion.tipo;
      if (validacion.tipo === 'referido') {
        descuento = Math.round(subtotal * 0.05);
      } else {
        const baseDescuento = calcularBaseDescuento(carrito, validacion.aplicaA);
        descuento = validacion.descuentoTipo === 'porcentaje'
          ? Math.round(baseDescuento * (validacion.descuentoValor / 100))
          : Math.min(validacion.descuentoValor, baseDescuento);
      }
    }
  }

  const total = subtotal + iva - descuento;

  return {
    link_id: null,
    cliente_nombre: cliente.nombre,
    cliente_email: cliente.email,
    cliente_telefono: cliente.telefono,
    carrito,
    extras: [],
    codigo_aplicado: codigoAplicado,
    tipo_codigo: tipoCodigo,
    totales: { subtotal, iva, totalDescuento: descuento, total },
    monto_a_pagar: total,
  };
}

function calcularBaseDescuento(carrito, aplicaA) {
  if (aplicaA.includes('todo')) {
    return carrito.reduce((sum, item) => sum + item.precio, 0);
  }
  return carrito.filter(item => aplicaA.includes(item.categoria)).reduce((sum, item) => sum + item.precio, 0);
}

async function validarCodigoInterno(codigo, cliente, carrito, headers) {
  const codigoUpper = codigo.trim().toUpperCase();

  const rCompras = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/compras?select=orden_id&estado=eq.pagada&or=(cliente_email.eq.${encodeURIComponent(cliente.email)},cliente_telefono.eq.${encodeURIComponent(cliente.telefono)})`,
    { headers }
  );
  const esPrimeraCompra = (await rCompras.json()).length === 0;

  const rReferido = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/codigos_referido?select=*&codigo=eq.${encodeURIComponent(codigoUpper)}`,
    { headers }
  );
  const referido = (await rReferido.json())[0];
  if (referido) {
    return referido.estado === 'activo' && esPrimeraCompra ? { valido: true, tipo: 'referido' } : { valido: false };
  }

  const rPromo = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/codigos_promocion?select=*&codigo=eq.${encodeURIComponent(codigoUpper)}`,
    { headers }
  );
  const promo = (await rPromo.json())[0];
  if (!promo) return { valido: false };

  const hoy = new Date().toISOString().slice(0, 10);
  const usoAgotado = promo.max_usos_globales !== null && promo.usos_actuales >= promo.max_usos_globales;
  if (promo.estado !== 'activo' || promo.fecha_inicio > hoy || promo.fecha_fin < hoy || usoAgotado) {
    return { valido: false };
  }

  const categoriasEnCarrito = new Set(carrito.map(i => i.categoria));
  const aplica = promo.aplica_a.includes('todo') || promo.aplica_a.some(cat => categoriasEnCarrito.has(cat));
  if (!aplica) return { valido: false };

  return { valido: true, tipo: 'promocion', descuentoTipo: promo.descuento_tipo, descuentoValor: promo.descuento_valor, aplicaA: promo.aplica_a };
}