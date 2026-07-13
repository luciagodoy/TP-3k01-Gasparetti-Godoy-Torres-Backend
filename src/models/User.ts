import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database'; 

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'huesped' | 'empleado' | 'admin';
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

class User 
  extends Model<UserAttributes, UserCreationAttributes> 
  implements UserAttributes 
{
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: 'huesped' | 'empleado' | 'admin';

  // Timestamps automáticos (activados abajo)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init({
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
    defaultValue: 'huesped'
  }
}, {
  sequelize,
  tableName: 'Usuarios', 
  timestamps: true 
});

export default User;