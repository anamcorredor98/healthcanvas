module.exports = async (req, res) => {
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = `${process.env.SUPABASE_URL}/rest/v1/codigos_referido`;

  try {
    // ── LISTAR ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=*&order=fecha_creacion.desc`, { headers });
      const codigos = await r.json();
      return res.status(200).json(codigos);
    }

    // ── CREAR ───────────────────────────────────────────────
    if (req.method === 'POST') {
      const {
        tipo, prefijo, nombreCodigo, codigoPersonalizado,
        profesion, propietarioNombre, propietarioEmail, propietarioTelefono,
      } = req.body;

      if (!propietarioNombre || !propietarioEmail || !propietarioTelefono) {
        return res.status(400).json({ error: 'Completa el nombre, correo y teléfono del cliente.' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propietarioEmail)) {
        return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
      }

      let codigo, baseCodigo = null;

      if (tipo === 'automatico') {
        baseCodigo = ((prefijo || '') + (nombreCodigo || '')).slice(0, 8);
        if (!baseCodigo) return res.status(400).json({ error: 'No se pudo armar el código.' });

        const rExistentes = await fetch(`${base}?select=codigo&codigo=like.${baseCodigo}*`, { headers });
        const existentes = (await rExistentes.json()).map(c => c.codigo);
        codigo = resolverCodigoAuto(baseCodigo, existentes);
      } else {
        codigo = (codigoPersonalizado || '').toUpperCase();
        if (!codigo) return res.status(400).json({ error: 'Escribe el código personalizado.' });

        const rExiste = await fetch(`${base}?select=codigo&codigo=eq.${encodeURIComponent(codigo)}`, { headers });
        if ((await rExiste.json()).length > 0) {
          return res.status(409).json({ error: 'Ese código ya existe. Usa otro.' });
        }
      }

      const nuevo = {
        codigo,
        tipo,
        base: baseCodigo,
        profesion: profesion || null,
        propietario_nombre: propietarioNombre,
        propietario_email: propietarioEmail,
        propietario_telefono: propietarioTelefono,
        estado: 'activo',
        reemplaza_a: null,
        reemplazado_por: null,
        referidos: 0,
        cashback_disponible: 0,
        cashback_historico: 0,
      };

      const rCrear = await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(nuevo),
      });
      const creado = await rCrear.json();
      return res.status(201).json(creado[0]);
    }

    // ── GENERAR REEMPLAZO ───────────────────────────────────
    if (req.method === 'PATCH') {
      const { codigoViejo, nuevoCodigo } = req.body;
      if (!codigoViejo) return res.status(400).json({ error: 'Falta el código a reemplazar.' });

      const rViejo = await fetch(`${base}?select=*&codigo=eq.${encodeURIComponent(codigoViejo)}`, { headers });
      const viejo = (await rViejo.json())[0];
      if (!viejo || viejo.estado !== 'activo') {
        return res.status(400).json({ error: 'Ese código no existe o ya no está activo.' });
      }

      let codigoFinal;
      if (viejo.tipo === 'automatico' && viejo.base) {
        const rExistentes = await fetch(`${base}?select=codigo&codigo=like.${viejo.base}*`, { headers });
        const existentes = (await rExistentes.json()).map(c => c.codigo);
        codigoFinal = resolverCodigoAuto(viejo.base, existentes);
      } else {
        codigoFinal = (nuevoCodigo || '').toUpperCase();
        if (!codigoFinal) return res.status(400).json({ error: 'Escribe el nuevo código de reemplazo.' });
        const rExiste = await fetch(`${base}?select=codigo&codigo=eq.${encodeURIComponent(codigoFinal)}`, { headers });
        if ((await rExiste.json()).length > 0) {
          return res.status(409).json({ error: 'Ese código ya existe. Usa otro.' });
        }
      }

      const nuevoRegistro = {
        codigo: codigoFinal,
        tipo: viejo.tipo,
        base: viejo.base,
        profesion: viejo.profesion,
        propietario_nombre: viejo.propietario_nombre,
        propietario_email: viejo.propietario_email,
        propietario_telefono: viejo.propietario_telefono,
        estado: 'activo',
        reemplaza_a: viejo.codigo,
        reemplazado_por: null,
        referidos: viejo.referidos,
        cashback_disponible: viejo.cashback_disponible,
        cashback_historico: viejo.cashback_historico,
      };

      const rCrear = await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(nuevoRegistro),
      });
      const creado = await rCrear.json();

      await fetch(`${base}?codigo=eq.${encodeURIComponent(viejo.codigo)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado: 'desactivado', reemplazado_por: codigoFinal }),
      });

      return res.status(201).json(creado[0]);
    }

    res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function resolverCodigoAuto(base, existentes) {
  const candidato = base + 'HC';
  if (!existentes.includes(candidato)) return candidato;
  let n = 1;
  while (existentes.includes(base + n + 'HC')) n++;
  return base + n + 'HC';
}