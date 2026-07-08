module.exports = async (req, res) => {
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = `${process.env.SUPABASE_URL}/rest/v1/links_privados`;

  try {
    // ── LISTAR ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=*&order=fecha_creacion.desc`, { headers });
      const links = await r.json();
      return res.status(200).json(links);
    }

    // ── CREAR (link normal, o pago final generado desde el historial) ──
    if (req.method === 'POST') {
      if (req.body.accion === 'generar_pago_final') {
        return await generarPagoFinal(req, res, base, headers);
      }
      return await crearLinkNormal(req, res, base, headers);
    }

    // ── RENOVAR / INVALIDAR / ACTIVAR ───────────────────────
    if (req.method === 'PATCH') {
      const { linkId, accion } = req.body;
      if (!linkId || !accion) return res.status(400).json({ error: 'Faltan datos.' });

      const rLink = await fetch(`${base}?select=*&link_id=eq.${encodeURIComponent(linkId)}`, { headers });
      const link = (await rLink.json())[0];
      if (!link) return res.status(404).json({ error: 'No se encontró el link.' });

      let cambios;
      if (accion === 'renovar') {
        cambios = { fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
      } else if (accion === 'invalidar') {
        if (link.estado === 'usado') {
          return res.status(400).json({ error: 'Ese link ya fue usado, no se puede invalidar.' });
        }
        cambios = { estado: 'anulado' };
      } else if (accion === 'activar') {
        if (link.estado !== 'guardado') {
          return res.status(400).json({ error: 'Ese link no está en estado guardado.' });
        }
        cambios = { estado: 'valido', fecha_expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
      } else {
        return res.status(400).json({ error: 'Acción no reconocida.' });
      }

      const rPatch = await fetch(`${base}?link_id=eq.${encodeURIComponent(linkId)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(cambios),
      });
      const actualizado = await rPatch.json();
      return res.status(200).json(actualizado[0]);
    }

    res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function crearLinkNormal(req, res, base, headers) {
  const { cliente, carrito, extras, totales, nombreProyecto, tipoPago, porcentajeAdelanto } = req.body;

  if (!cliente?.nombre || !cliente?.email || !cliente?.telefono) {
    return res.status(400).json({ error: 'Completa los datos del cliente.' });
  }
  if ((!carrito || carrito.length === 0) && (!extras || extras.length === 0)) {
    return res.status(400).json({ error: 'Selecciona al menos un plan o elemento.' });
  }

  const tipo = tipoPago || 'total';
  const total = totales?.total || 0;
  let montoAPagar = total;
  let montoPendiente = null;

  if (tipo === 'adelanto') {
    const pct = porcentajeAdelanto || 50;
    montoAPagar = Math.round(total * (pct / 100));
    montoPendiente = total - montoAPagar;
  } else if (tipo === 'pago_final') {
    const pct = porcentajeAdelanto || 50;
    montoAPagar = Math.round(total * (pct / 100));
    montoPendiente = 0;
  }

  const ahora = new Date();
  const expiracion = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  const nuevo = {
    link_id: generarUUID(),
    nombre_proyecto: nombreProyecto || null,
    cliente_nombre: cliente.nombre,
    cliente_email: cliente.email,
    cliente_telefono: cliente.telefono,
    carrito: carrito || [],
    extras: extras || [],
    totales: totales || {},
    tipo_pago: tipo,
    porcentaje_adelanto: tipo !== 'total' ? (porcentajeAdelanto || 50) : null,
    monto_a_pagar: montoAPagar,
    monto_pendiente: montoPendiente,
    estado: 'valido',
    fecha_creacion: ahora.toISOString(),
    fecha_expiracion: expiracion.toISOString(),
    vistos_count: 0,
  };

  const rCrear = await fetch(base, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(nuevo),
  });
  const creado = await rCrear.json();
  return res.status(201).json(creado[0]);
}

async function generarPagoFinal(req, res, base, headers) {
  const { linkIdOrigen, enviarAhora } = req.body;
  if (!linkIdOrigen) return res.status(400).json({ error: 'Falta el link de origen.' });

  const rOrigen = await fetch(`${base}?select=*&link_id=eq.${encodeURIComponent(linkIdOrigen)}`, { headers });
  const origen = (await rOrigen.json())[0];
  if (!origen) return res.status(404).json({ error: 'No se encontró el link original.' });
  if (origen.tipo_pago !== 'adelanto') {
    return res.status(400).json({ error: 'Ese link no es un adelanto.' });
  }
  if (!origen.monto_pendiente || origen.monto_pendiente <= 0) {
    return res.status(400).json({ error: 'Ese link no tiene monto pendiente.' });
  }

  const ahora = new Date();
  const estado = enviarAhora ? 'valido' : 'guardado';
  const expiracion = enviarAhora ? new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString() : null;

  const nuevo = {
    link_id: generarUUID(),
    nombre_proyecto: origen.nombre_proyecto,
    cliente_nombre: origen.cliente_nombre,
    cliente_email: origen.cliente_email,
    cliente_telefono: origen.cliente_telefono,
    carrito: origen.carrito,
    extras: origen.extras,
    totales: origen.totales,
    tipo_pago: 'pago_final',
    porcentaje_adelanto: null,
    monto_a_pagar: origen.monto_pendiente,
    monto_pendiente: 0,
    link_relacionado_id: origen.link_id,
    estado,
    fecha_creacion: ahora.toISOString(),
    fecha_expiracion: expiracion,
    vistos_count: 0,
  };

  const rCrear = await fetch(base, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(nuevo),
  });
  const creado = await rCrear.json();

  await fetch(`${base}?link_id=eq.${encodeURIComponent(origen.link_id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ link_relacionado_id: creado[0].link_id }),
  });

  return res.status(201).json(creado[0]);
}

function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}