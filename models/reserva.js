const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Huesped = require('./Huesped');
const Habitacion = require('./Habitacion');

const Reserva = sequelize.define('Reserva', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fechaInicio: { type: DataTypes.DATEONLY, allowNull: false }, // DATEONLY guarda 'YYYY-MM-DD' sin hora
  fechaFin: { type: DataTypes.DATEONLY, allowNull: false },
  estado: { 
    type: DataTypes.ENUM('pendiente', 'check-in', 'check-out', 'cancelada'), 
    defaultValue: 'pendiente' 
  },
  montoTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

// Configurar Relaciones
Huesped.hasMany(Reserva, { foreignKey: 'huespedId', as: 'reservas' });
Reserva.belongsTo(Huesped, { foreignKey: 'huespedId', as: 'huesped' });

Habitacion.hasMany(Reserva, { foreignKey: 'habitacionId', as: 'reservas' });
Reserva.belongsTo(Habitacion, { foreignKey: 'habitacionId', as: 'habitacion' });

module.exports = Reserva;