module.exports = async (req, res) => {
  try {
    const respuesta = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/prueba_conexion?select=*`,
      {
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`
        }
      }
    );
    const datos = await respuesta.json();
    res.status(200).json({ conexion: 'exitosa', datos });
  } catch (error) {
    res.status(500).json({ conexion: 'fallo', error: error.message });
  }
};