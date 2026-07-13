const User = require('../models/User');
const Huesped = require('../models/huesped');
const sequelize = require('../config/database');

exports.registrarHuesped = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { email, password, telefono, documentoIdentidad, ciudad, provincia, pais } = req.body;
    const nuevoUsuario = await User.create({
      email,
      password,
      role: 'huesped'
    }, { transaction: t });
    const nuevoHuesped = await Huesped.create({
      telefono,
      documentoIdentidad,
      ciudad,      
      provincia,  
      pais,        
      userId: nuevoUsuario.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ mensaje: 'Huésped creado con éxito' });

  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: 'Error al registrar', detalle: error.message });
  }
};