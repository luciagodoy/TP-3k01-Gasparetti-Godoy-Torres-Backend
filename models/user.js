const { DataTypes } = require('sequelize');
const sequelize = require('./database'); 


const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false, 
    unique: true      
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true   
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('huesped', 'empleado', 'admin'),
    allowNull: false,
    defaultValue: 'huesped'}
}, {
  timestamps: true 
});

module.exports = User;