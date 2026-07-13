const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CategoriaHabitacion = sequelize.define('CategoriaHabitacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  denominacion: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true 
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  capacidadPersonas: {
    type: DataTypes.INTEGER,
    allowNull: false 
  }
}, {
  tableName: 'CategoriasHabitacion', 
  timestamps: true
});

module.exports = CategoriaHabitacion;