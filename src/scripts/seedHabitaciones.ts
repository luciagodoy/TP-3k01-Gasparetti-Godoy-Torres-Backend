// Carga categorías de habitación (con varias fotos cada una) y habitaciones de
// ejemplo, para poder probar el flujo de búsqueda/reserva sin cargar todo a mano.
// Las fotos son de Picsum (https://picsum.photos), un servicio gratuito de
// imágenes de stock con URLs fijas y reproducibles.
//
// Uso: npm run seed:habitaciones

import { sequelize } from '../config/database';
import CategoriaHabitacion from '../models/categoriaHabitacion';
import Habitacion from '../models/Habitacion';

const fotos = (seeds: string[]) => seeds.map((seed) => `https://picsum.photos/seed/${seed}/800/600`);

const CATEGORIAS = [
  {
    denominacion: 'Estándar',
    descripcion: 'Habitación cómoda y luminosa, ideal para estadías cortas.',
    capacidadPersonas: 2,
    precioNoche: 15000,
    imagenesUrl: fotos(['hotel-estandar-1', 'hotel-estandar-2']),
    habitaciones: [
      { numero: 101, piso: 1 },
      { numero: 102, piso: 1 },
      { numero: 103, piso: 1 }
    ]
  },
  {
    denominacion: 'Doble Superior',
    descripcion: 'Habitación amplia con dos camas, pensada para familias o grupos.',
    capacidadPersonas: 4,
    precioNoche: 22000,
    imagenesUrl: fotos(['hotel-doble-1', 'hotel-doble-2']),
    habitaciones: [
      { numero: 201, piso: 2 },
      { numero: 202, piso: 2 },
      { numero: 203, piso: 2 }
    ]
  },
  {
    denominacion: 'Suite',
    descripcion: 'Suite con living independiente y vista a la ciudad.',
    capacidadPersonas: 3,
    precioNoche: 35000,
    imagenesUrl: fotos(['hotel-suite-1', 'hotel-suite-2', 'hotel-suite-3']),
    habitaciones: [
      { numero: 301, piso: 3 },
      { numero: 302, piso: 3 }
    ]
  }
];

// Ya existe una "Presidential Suite" cargada por el equipo (sin fotos); solo le sumamos imágenes y una habitación.
const PRESIDENTIAL = {
  denominacion: 'Presidential Suite',
  imagenesUrl: fotos(['hotel-presidential-1', 'hotel-presidential-2', 'hotel-presidential-3']),
  habitaciones: [{ numero: 2801, piso: 28 }]
};

async function main() {
  await sequelize.authenticate();

  for (const cat of CATEGORIAS) {
    let categoria = await CategoriaHabitacion.findOne({ where: { denominacion: cat.denominacion } });
    if (!categoria) {
      await CategoriaHabitacion.create({
        denominacion: cat.denominacion,
        descripcion: cat.descripcion,
        capacidadPersonas: cat.capacidadPersonas,
        precioNoche: cat.precioNoche,
        imagenesUrl: cat.imagenesUrl
      } as any);
      categoria = await CategoriaHabitacion.findOne({ where: { denominacion: cat.denominacion } });
      console.log(`Categoría creada: ${cat.denominacion}`);
    } else {
      console.log(`Categoría ya existía: ${cat.denominacion} (sin modificar)`);
    }

    const categoriaId = categoria!.getDataValue('id');
    for (const hab of cat.habitaciones) {
      const existente = await Habitacion.findOne({ where: { numero: hab.numero } });
      if (!existente) {
        await Habitacion.create({ numero: hab.numero, piso: hab.piso, categoriaId } as any);
        console.log(`  Habitación creada: N° ${hab.numero}`);
      }
    }
  }

  // Presidential Suite: solo le agregamos fotos si todavía no tiene, y sumamos su habitación.
  const presidential = await CategoriaHabitacion.findOne({ where: { denominacion: PRESIDENTIAL.denominacion } });
  if (presidential) {
    const imagenesActuales = presidential.getDataValue('imagenesUrl') as string[];
    if (!imagenesActuales || imagenesActuales.length === 0) {
      await presidential.update({ imagenesUrl: PRESIDENTIAL.imagenesUrl } as any);
      console.log('Fotos agregadas a Presidential Suite');
    }
    const categoriaId = presidential.getDataValue('id');
    for (const hab of PRESIDENTIAL.habitaciones) {
      const existente = await Habitacion.findOne({ where: { numero: hab.numero } });
      if (!existente) {
        await Habitacion.create({ numero: hab.numero, piso: hab.piso, categoriaId } as any);
        console.log(`  Habitación creada: N° ${hab.numero}`);
      }
    }
  }

  console.log('Listo.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
