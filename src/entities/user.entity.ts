import {Model, DataTypes, Optional} from 'sequelize';
import bcrypt from 'bcryptjs';
import {sequelize} from '../config/database';

// Stored values are kept as they are in the database (they are data, not code).
export const Role = {
  GUEST: 'huesped',
  EMPLOYEE: 'empleado',
  ADMIN: 'admin'
} as const;
export type Role = (typeof Role)[keyof typeof Role];

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  role: Role;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare email: string;
  declare password: string;
  declare role: Role;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  async comparePassword(candidate: string): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
  }

  // Never expose the password hash in an API response.
  toSafeJSON(): Omit<UserAttributes, 'password'> {
    const {password: _password, ...safe} = this.toJSON();
    return safe;
  }
}

User.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    username: {type: DataTypes.STRING, allowNull: false, unique: true},
    email: {type: DataTypes.STRING, allowNull: false, validate: {isEmail: true}},
    password: {type: DataTypes.STRING, allowNull: false},
    role: {
      type: DataTypes.ENUM(Role.GUEST, Role.EMPLOYEE, Role.ADMIN),
      allowNull: false,
      defaultValue: Role.GUEST
    }
  },
  {
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
  }
);

export default User;
