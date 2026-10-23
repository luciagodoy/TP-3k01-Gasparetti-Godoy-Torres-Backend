import {Model, DataTypes, Optional} from 'sequelize';
import {sequelize} from '../config/database';
import type RoomCategory from './room-category.entity';

// Qué mide la regla: la ocupación de la categoría en cada noche (%), o
// los días que faltan hasta el check-in.
export const PricingRuleType = {
  OCCUPANCY: 'ocupacion',
  LEAD_TIME: 'antelacion'
} as const;
export type PricingRuleType = (typeof PricingRuleType)[keyof typeof PricingRuleType];

// Cómo cambia el precio la regla: un porcentaje (se multiplica con el porcentaje
// de la otra regla) o un monto fijo por noche.
export const AdjustmentType = {
  PERCENTAGE: 'porcentaje',
  FIXED: 'fijo'
} as const;
export type AdjustmentType = (typeof AdjustmentType)[keyof typeof AdjustmentType];

// Un escalón de la tarifa dinámica ("yield management"): cuando la medida cae
// en [from, to), el precio por noche se ajusta en `value`. `to` null = sin límite
// superior (el escalón más alto). `categoryId` null = aplica a todas las categorías.
interface PricingRuleAttributes {
  id: number;
  type: PricingRuleType;
  from: number;
  to: number | null;
  adjustmentType: AdjustmentType;
  value: number;
  active: boolean;
  categoryId: number | null;
}

interface PricingRuleCreationAttributes extends Optional<PricingRuleAttributes, 'id' | 'to' | 'active' | 'categoryId'> {}

class PricingRule extends Model<PricingRuleAttributes, PricingRuleCreationAttributes> implements PricingRuleAttributes {
  declare id: number;
  declare type: PricingRuleType;
  declare from: number;
  declare to: number | null;
  declare adjustmentType: AdjustmentType;
  declare value: number;
  declare active: boolean;
  declare categoryId: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare category?: RoomCategory;
}

PricingRule.init(
  {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    type: {
      type: DataTypes.ENUM(PricingRuleType.OCCUPANCY, PricingRuleType.LEAD_TIME),
      allowNull: false,
      field: 'tipo'
    },
    from: {type: DataTypes.INTEGER, allowNull: false, field: 'desde', validate: {min: 0}},
    to: {type: DataTypes.INTEGER, allowNull: true, field: 'hasta'},
    adjustmentType: {
      type: DataTypes.ENUM(AdjustmentType.PERCENTAGE, AdjustmentType.FIXED),
      allowNull: false,
      field: 'tipoAjuste'
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'valor',
      get() {
        const value = this.getDataValue('value');
        return value ? parseFloat(value as unknown as string) : 0;
      }
    },
    active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'activa'},
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'categoriaId',
      references: {model: 'CategoriasHabitacion', key: 'id'}
    }
  },
  {sequelize, tableName: 'ReglasTarifa', timestamps: true}
);

export default PricingRule;
