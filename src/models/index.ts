import CategoriaHabitacion from './categoriaHabitacion';
import Habitacion from './Habitacion';

CategoriaHabitacion.hasMany(Habitacion, {
  foreignKey: 'categoriaId',
  as: 'habitaciones'
});

Habitacion.belongsTo(CategoriaHabitacion, {
  foreignKey: 'categoriaId',
  as: 'categoria'
});

export { CategoriaHabitacion, Habitacion };