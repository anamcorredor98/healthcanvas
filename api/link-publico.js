// Endpoint PÚBLICO — cualquier cliente con su linkId lo consulta al abrir tienda.html?linkId=...
// No requiere ADMIN_SECRET: la "llave" de acceso es el propio linkId (un UUID imposible de adivinar).
// Este archivo NUNCA lista todos los links ni permite modificarlos, salvo sumar la vista.

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { linkId } = req.query;
  if (!linkId) {
    return res.status(400).json({ error: 'Falta el linkId.' });
  }

  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = `${process.env.SUPABASE_URL}/rest/v1/links_privados`;

  try {
    const rLink = await fetch(`${base}?select=*&link_id=eq.${encodeURIComponent(linkId)}`, { headers });
    const link = (await rLink.json())[0];

    // Link inexistente, o "guardado" (pago final aún no activado) — no debe ser accesible públicamente todavía.
    if (!link || link.estado === 'guardado') {
      return res.status(404).json({ estado_publico: 'no_encontrado' });
    }

    if (link.estado === 'anulado') {
      return res.status(200).json({ estado_publico: 'anulado' });
    }

    if (link.estado === 'usado') {
      return res.status(200).json({ estado_publico: 'usado' });
    }

    if (link.fecha_expiracion && new Date(link.fecha_expiracion) < new Date()) {
      return res.status(200).json({ estado_publico: 'expirado' });
    }

    // Link válido: sumar la vista y devolver solo los datos necesarios para pintar la tienda.
    const nuevasVistas = (link.vistos_count || 0) + 1;
    const rPatch = await fetch(`${base}?link_id=eq.${encodeURIComponent(linkId)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ vistos_count: nuevasVistas }),
    });
    const actualizado = (await rPatch.json())[0];

    return res.status(200).json({
      estado_publico: 'valido',
      link_id: actualizado.link_id,
      nombre_proyecto: actualizado.nombre_proyecto,
      cliente_nombre: actualizado.cliente_nombre,
      cliente_email: actualizado.cliente_email,
      cliente_telefono: actualizado.cliente_telefono,
      pagador_es_diferente: actualizado.pagador_es_diferente,
      pagador_nombre: actualizado.pagador_nombre,
      pagador_email: actualizado.pagador_email,
      pagador_telefono: actualizado.pagador_telefono,
      carrito: actualizado.carrito || [],
      extras: actualizado.extras || [],
      totales: actualizado.totales || {},
      tipo_pago: actualizado.tipo_pago,
      porcentaje_adelanto: actualizado.porcentaje_adelanto,
      monto_a_pagar: actualizado.monto_a_pagar,
      monto_pendiente: actualizado.monto_pendiente,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};