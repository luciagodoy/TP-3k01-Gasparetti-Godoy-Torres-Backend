require('dotenv').config(); 
const express = require('express');
const sequelize = require('./config/database'); // Ajusta esta ruta a donde tengas tu database.js

// === IMPORTACIÓN DE MODELOS (Corregidas mayúsculas y duplicados) ===
const User = require('./models/User');
const Huesped = require('./models/huesped');
const CategoriaHabitacion = require('./models/categoriaHabitacion');
const Habitacion = require('./models/habitacion');
const Reserva = require('./models/reserva');

// === IMPORTACIÓN DE RUTAS ===
const reservaRoutes = require('./routes/reservaRoutes');
const habitacionRoutes = require('./routes/habitacionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARES ===
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// === ENRUTAMIENTO (Se agregó la ruta de habitaciones que faltaba) ===
app.use('/api/reservas', reservaRoutes);
app.use('/api/habitaciones', habitacionRoutes); // <-- ¡Agregado!

// Ruta de control
app.get('/', (req, res) => {
  res.send('¡Servidor Express y Sequelize funcionando correctamente!');
});

// Ruta temporal para crear usuarios (Mantenida por si la usan para pruebas iniciales)
app.post('/usuarios', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const nuevoUsuario = await User.create({ username, email, password });
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo crear el usuario', detalle: error.message });
  }
});

// === ARRANQUE DEL SERVIDOR ===
async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida con éxito.');
    
    await sequelize.sync({ alter: true });
    console.log('🔄 Tablas sincronizadas correctamente.');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Express corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error crítico al conectar a la base de datos:', error);
  }
}

iniciarServidor();