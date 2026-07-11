const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); 

const Huesped = sequelize.define('Huesped', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentoIdentidad: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  ciudad: {
    type: DataTypes.STRING,
    allowNull: false 
  },
  provincia: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pais: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Argentina' 
  }
});


User.hasOne(Huesped, { foreignKey: 'userId', as: 'perfilHuesped', onDelete: 'CASCADE' });
Huesped.belongsTo(User, { foreignKey: 'userId', as: 'usuario' });

module.exports = Huesped;