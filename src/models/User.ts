import { Model, DataTypes, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';

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
  declare id: number;
  declare username: string;
  declare email: string;
  declare password: string;
  declare role: 'huesped' | 'empleado' | 'admin';

  // Timestamps automáticos (activados abajo)
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  public async comparePassword(candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
  }
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
  timestamps: true,
  hooks: {
    beforeSave: async (user: User) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

export default User;
