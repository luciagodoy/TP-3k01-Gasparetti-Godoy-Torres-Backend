require('dotenv').config();
const express = require('express');
const sequelize = require('./database'); 
const User = require('./User');          

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


app.post('/usuarios', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const nuevoUsuario = await User.create({ username, email, password });
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo crear el usuario', detalle: error.message });
  }
});

async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida con éxito.');
    await sequelize.sync({ alter: true });
    console.log('🔄 Tablas sincronizadas correctamente.');
    app.listen(PORT, () => {
      console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Error crítico al conectar a la base de datos:', error);
  }
}

iniciarServidor();