// api/validar-codigo.js
// Endpoint PÚBLICO — se llama desde tienda.html cuando el cliente escribe un código.
// Valida contra Supabase; nunca se confía en un descuento calculado en el navegador.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const { codigo, email, telefono, carrito } = req.body;

  if (!codigo || !email || !telefono) {
    return res.status(400).json({ valido: false, mensaje: 'Faltan datos para validar el código.' });
  }

  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const codigoUpper = codigo.trim().toUpperCase();

  try {
    // ¿Ya hay una compra PAGADA con este email o teléfono? (bloquea referido en no-primera-compra,
    // sin importar si esa compra anterior vino de un link privado o de la tienda directa)
    const rCompras = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/compras?select=orden_id&estado=eq.pagada&or=(cliente_email.eq.${encodeURIComponent(email)},cliente_telefono.eq.${encodeURIComponent(telefono)})`,
      { headers }
    );
    const esPrimeraCompra = (await rCompras.json()).length === 0;

    // 1. ¿Es un código de REFERIDO?
    const rReferido = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/codigos_referido?select=*&codigo=eq.${encodeURIComponent(codigoUpper)}`,
      { headers }
    );
    const referido = (await rReferido.json())[0];

    if (referido) {
      if (referido.estado !== 'activo') {
        return res.status(200).json({ valido: false, mensaje: 'Este código de referido ya no está activo.' });
      }
      if (!esPrimeraCompra) {
        return res.status(200).json({ valido: false, mensaje: 'Los códigos de referido solo aplican en tu primera compra con nosotros.' });
      }
      return res.status(200).json({
        valido: true,
        tipo: 'referido',
        descuentoPorcentaje: 5,
        mensaje: '✓ Código de referido aplicado: 5% de descuento',
      });
    }

    // 2. ¿Es un código PROMOCIONAL?
    const rPromo = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/codigos_promocion?select=*&codigo=eq.${encodeURIComponent(codigoUpper)}`,
      { headers }
    );
    const promo = (await rPromo.json())[0];

    if (!promo) {
      return res.status(200).json({ valido: false, mensaje: 'Código no válido.' });
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (promo.estado !== 'activo') {
      return res.status(200).json({ valido: false, mensaje: 'Este código está pausado.' });
    }
    if (promo.fecha_inicio > hoy || promo.fecha_fin < hoy) {
      return res.status(200).json({ valido: false, mensaje: 'Este código no está vigente.' });
    }
    if (promo.max_usos_globales !== null && promo.usos_actuales >= promo.max_usos_globales) {
      return res.status(200).json({ valido: false, mensaje: 'Este código ya alcanzó su límite de usos.' });
    }

    const categoriasEnCarrito = new Set((carrito || []).map(i => i.categoria));
    const aplica = promo.aplica_a.includes('todo') || promo.aplica_a.some(cat => categoriasEnCarrito.has(cat));
    if (!aplica) {
      return res.status(200).json({ valido: false, mensaje: 'Este código no aplica a los elementos de tu carrito.' });
    }

    return res.status(200).json({
      valido: true,
      tipo: 'promocion',
      descuentoTipo: promo.descuento_tipo,
      descuentoValor: promo.descuento_valor,
      aplicaA: promo.aplica_a,
      mensaje: '✓ Código promocional aplicado',
    });
  } catch (error) {
    return res.status(500).json({ valido: false, mensaje: 'Error validando el código.', detalle: error.message });
  }
};