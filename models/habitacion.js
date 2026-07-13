const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CategoriaHabitacion = require('./CategoriaHabitacion'); // Importamos el padre

const Habitacion = sequelize.define('Habitacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true 
  },
  piso: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estadoDisponibilidad: {
    type: DataTypes.ENUM('disponible', 'ocupada', 'mantenimiento'),
    allowNull: false,
    defaultValue: 'disponible'
  }
  
}, {
  tableName: 'Habitaciones',
  timestamps: true
});

CategoriaHabitacion.hasMany(Habitacion, { 
  foreignKey: 'categoriaId', 
  as: 'habitaciones',
  onDelete: 'RESTRICT' 
});

Habitacion.belongsTo(CategoriaHabitacion, { 
  foreignKey: 'categoriaId', 
  as: 'categoria' 
});

module.exports = Habitacion;