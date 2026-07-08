// api/confirmar-pago.js
// Bold llamará a este endpoint (webhook) cuando un pago se confirme o falle.
// Todo lo marcado con 🔶 depende de lo que Bold te confirme en la reunión.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  // ============================================================
  // 🔶 VERIFICACIÓN DE AUTENTICIDAD — PREGUNTA ESTO EN LA REUNIÓN, NO LO DEJES PENDIENTE.
  // Bold normalmente firma sus webhooks para que nadie pueda llamar este endpoint
  // haciéndose pasar por ellos. Pregúntales CÓMO se verifica (header con firma,
  // secreto compartido, etc.) y esa verificación va exactamente aquí, ANTES de
  // tocar cualquier dato. Sin esto, cualquiera podría marcar compras como
  // pagadas sin haber pagado.
  // ============================================================

  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // 🔶 Ajusta estos nombres de campo a los que realmente mande Bold en el body.
    const { ordenId, transactionId, estado } = req.body;
    if (!ordenId) return res.status(400).json({ error: 'Falta el ordenId.' });

    const baseCompras = `${process.env.SUPABASE_URL}/rest/v1/compras`;
    const rCompra = await fetch(`${baseCompras}?select=*&orden_id=eq.${encodeURIComponent(ordenId)}`, { headers });
    const compra = (await rCompra.json())[0];
    if (!compra) return res.status(404).json({ error: 'No se encontró la orden.' });

    // 🔶 Ajusta esta condición al valor exacto que Bold use para "pago aprobado"
    const pagoAprobado = estado === 'aprobado' || estado === 'approved';

    await fetch(`${baseCompras}?orden_id=eq.${encodeURIComponent(ordenId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ estado: pagoAprobado ? 'pagada' : 'fallida', bold_transaction_id: transactionId || null }),
    });

    if (!pagoAprobado) {
      return res.status(200).json({ ok: true, registrado: 'fallida' });
    }

    // 1. Si venía de un link privado → marcarlo como usado
    if (compra.link_id) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/links_privados?link_id=eq.${encodeURIComponent(compra.link_id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: 'usado' }),
      });
    }

    // 2. Si hubo código de referido → sumar referidos + cashback (1% del monto pagado)
    if (compra.tipo_codigo === 'referido' && compra.codigo_aplicado) {
      const baseRef = `${process.env.SUPABASE_URL}/rest/v1/codigos_referido`;
      const rRef = await fetch(`${baseRef}?select=*&codigo=eq.${encodeURIComponent(compra.codigo_aplicado)}`, { headers });
      const ref = (await rRef.json())[0];
      if (ref) {
        const cashback = Math.round(compra.monto_a_pagar * 0.01);
        await fetch(`${baseRef}?codigo=eq.${encodeURIComponent(compra.codigo_aplicado)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            referidos: (ref.referidos || 0) + 1,
            cashback_disponible: (ref.cashback_disponible || 0) + cashback,
            cashback_historico: (ref.cashback_historico || 0) + cashback,
          }),
        });
      }
    }

    // 3. Si hubo código promocional → sumar uso
    if (compra.tipo_codigo === 'promocion' && compra.codigo_aplicado) {
      const basePromo = `${process.env.SUPABASE_URL}/rest/v1/codigos_promocion`;
      const rPromo = await fetch(`${basePromo}?select=usos_actuales&codigo=eq.${encodeURIComponent(compra.codigo_aplicado)}`, { headers });
      const promo = (await rPromo.json())[0];
      if (promo) {
        await fetch(`${basePromo}?codigo=eq.${encodeURIComponent(compra.codigo_aplicado)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ usos_actuales: (promo.usos_actuales || 0) + 1 }),
        });
      }
    }

    return res.status(200).json({ ok: true, registrado: 'pagada' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};