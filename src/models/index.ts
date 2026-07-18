import CategoriaHabitacion from './categoriaHabitacion';
import Habitacion from './habitacion';

CategoriaHabitacion.hasMany(Habitacion, {
  foreignKey: 'categoriaId',
  as: 'habitaciones'
});

Habitacion.belongsTo(CategoriaHabitacion, {
  foreignKey: 'categoriaId',
  as: 'categoria'
});

export { CategoriaHabitacion, Habitacion };