// api/confirmar-pago.js
const crypto = require('crypto');

// IMPORTANTE: esto desactiva el parseo automático del body — lo necesitamos
// crudo (sin tocar) para poder verificar la firma tal como lo pide Bold.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function leerCuerpoCrudo(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const rawBody = await leerCuerpoCrudo(req);
  const firmaRecibida = req.headers['x-bold-signature'] || '';

  // Verificación de la firma según la documentación de Bold:
  // 1. Convertir el cuerpo crudo a Base64
  // 2. HMAC-SHA256 de eso usando la llave secreta
  // 3. Comparar con el header x-bold-signature
  const encoded = Buffer.from(rawBody).toString('base64');
  const hashed = crypto.createHmac('sha256', process.env.BOLD_LLAVE_SECRETA).update(encoded).digest('hex');

  const firmaValida =
    hashed.length === firmaRecibida.length &&
    crypto.timingSafeEqual(Buffer.from(hashed), Buffer.from(firmaRecibida));

  if (!firmaValida) {
    return res.status(400).json({ error: 'Firma inválida.' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return res.status(400).json({ error: 'Body inválido.' });
  }

  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const tipo = payload.type; // SALE_APPROVED | SALE_REJECTED | VOID_APPROVED | VOID_REJECTED
    const ordenId = payload.data?.metadata?.reference;
    const paymentId = payload.data?.payment_id;

    if (!ordenId) {
      // No podemos ubicar a qué orden pertenece; confirmamos recepción igual para que Bold no reintente.
      return res.status(200).json({ ok: true, aviso: 'sin_referencia' });
    }

    const baseCompras = `${process.env.SUPABASE_URL}/rest/v1/compras`;
    const rCompra = await fetch(`${baseCompras}?select=*&orden_id=eq.${encodeURIComponent(ordenId)}`, { headers });
    const compra = (await rCompra.json())[0];

    if (!compra) {
      return res.status(200).json({ ok: true, aviso: 'orden_no_encontrada' });
    }

    // Idempotencia: si ya está pagada, no reprocesar (evita duplicar cashback/usos)
    if (compra.estado === 'pagada' && tipo === 'SALE_APPROVED') {
      return res.status(200).json({ ok: true, aviso: 'ya_procesada' });
    }

    if (tipo === 'SALE_APPROVED') {
      await fetch(`${baseCompras}?orden_id=eq.${encodeURIComponent(ordenId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: 'pagada', bold_transaction_id: paymentId || null }),
      });

      if (compra.link_id) {
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/links_privados?link_id=eq.${encodeURIComponent(compra.link_id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ estado: 'usado' }),
        });
      }

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
    }

    if (tipo === 'SALE_REJECTED') {
      await fetch(`${baseCompras}?orden_id=eq.${encodeURIComponent(ordenId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: 'fallida', bold_transaction_id: paymentId || null }),
      });
      return res.status(200).json({ ok: true, registrado: 'fallida' });
    }

    // VOID_APPROVED / VOID_REJECTED (anulaciones/reembolsos): se registran, pero
    // no se revierte automáticamente el link/cashback — eso lo revisas tú a mano
    // caso por caso, es un evento poco común y de más cuidado.
    if (tipo === 'VOID_APPROVED') {
      await fetch(`${baseCompras}?orden_id=eq.${encodeURIComponent(ordenId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: 'anulada' }),
      });
    }

    return res.status(200).json({ ok: true, registrado: 'evento_recibido' });
  } catch (error) {
    // Aun con error interno, confirmamos 200 solo si ya alcanzamos a leer el body;
    // si prefieres que Bold reintente ante error real, cambia esto a status(500).
    return res.status(500).json({ error: error.message });
  }
};