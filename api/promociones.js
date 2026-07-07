module.exports = async (req, res) => {
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = `${process.env.SUPABASE_URL}/rest/v1/codigos_promocion`;

  try {
    // ── LISTAR ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const r = await fetch(`${base}?select=*&order=fecha_creacion.desc`, { headers });
      const codigos = await r.json();
      const conEstado = codigos.map(c => ({ ...c, estado_mostrado: calcularEstadoMostrado(c) }));
      return res.status(200).json(conEstado);
    }

    // ── CREAR ───────────────────────────────────────────────
    if (req.method === 'POST') {
      const {
        motivo, anio, descuentoTipo, descuentoValor,
        fechaInicio, fechaFin, maxUsosGlobales, aplicaA, descripcion,
      } = req.body;

      if (!motivo || !anio || !descuentoValor || !fechaInicio || !fechaFin || !aplicaA?.length) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
      }

      const baseCodigo = motivo + anio;

      // Busca códigos existentes que empiecen igual, para resolver duplicados
      const rExistentes = await fetch(
        `${base}?select=codigo&codigo=like.${baseCodigo}*`,
        { headers }
      );
      const existentes = (await rExistentes.json()).map(c => c.codigo);
      const codigo = resolverCodigo(baseCodigo, existentes);

      const nuevo = {
        codigo,
        motivo,
        anio,
        descuento_tipo: descuentoTipo,
        descuento_valor: descuentoValor,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        max_usos_globales: maxUsosGlobales ?? null,
        usos_actuales: 0,
        aplica_a: aplicaA,
        estado: 'activo',
        descripcion: descripcion || null,
      };

      const rCrear = await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(nuevo),
      });
      const creado = await rCrear.json();
      return res.status(201).json(creado[0]);
    }

    // ── PAUSAR / ACTIVAR ────────────────────────────────────
    if (req.method === 'PATCH') {
      const { codigo, estado } = req.body;
      if (!codigo || !estado) {
        return res.status(400).json({ error: 'Faltan datos.' });
      }
      const rPatch = await fetch(`${base}?codigo=eq.${encodeURIComponent(codigo)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ estado }),
      });
      const actualizado = await rPatch.json();
      return res.status(200).json(actualizado[0]);
    }

    res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function calcularEstadoMostrado(c) {
  if (c.estado === 'pausado') return { texto: 'Pausado', clase: 'pausado' };
  const hoy = new Date().toISOString().slice(0, 10);
  const usoAgotado = c.max_usos_globales !== null && c.usos_actuales >= c.max_usos_globales;
  if (usoAgotado || c.fecha_fin < hoy) return { texto: 'Vencido', clase: 'vencido' };
  if (c.fecha_inicio > hoy) return { texto: 'Programado', clase: 'programado' };
  return { texto: 'Activo', clase: 'activo' };
}

function resolverCodigo(base, existentes) {
  const candidato = base + 'HC';
  if (!existentes.includes(candidato)) return candidato;
  let n = 1;
  while (existentes.includes(`${base}-${n}HC`)) n++;
  return `${base}-${n}HC`;
}