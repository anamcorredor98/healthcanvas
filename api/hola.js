module.exports = (req, res) => {
  res.status(200).json({
    mensaje: 'Hola desde el backend de HealthCanvas 👋',
    corriendo_en: 'servidor (no en el navegador)',
    fecha: new Date().toISOString(),
    secreto: process.env.MENSAJE_SECRETO
  });
};