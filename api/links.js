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

    // ── CREAR ───────────────────────────────────────────────
    if (req.method === 'POST') {
      const { cliente, carrito, extras, totales } = req.body;

      if (!cliente?.nombre || !cliente?.email || !cliente?.telefono) {
        return res.status(400).json({ error: 'Completa los datos del cliente.' });
      }
      if ((!carrito || carrito.length === 0) && (!extras || extras.length === 0)) {
        return res.status(400).json({ error: 'Selecciona al menos un plan o elemento.' });
      }

      const ahora = new Date();
      const expiracion = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

      const nuevo = {
        link_id: generarUUID(),
        cliente_nombre: cliente.nombre,
        cliente_email: cliente.email,
        cliente_telefono: cliente.telefono,
        carrito: carrito || [],
        extras: extras || [],
        totales: totales || {},
        tipo_pago: 'total',
        monto_a_pagar: totales?.total || 0,
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

    // ── RENOVAR / INVALIDAR ─────────────────────────────────
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

function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}