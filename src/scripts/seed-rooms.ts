// Carga categorías de habitación (con algunas fotos cada una) y habitaciones de ejemplo, para
// probar el flujo de búsqueda/reserva sin tipear todo. Las fotos vienen de Picsum
// (https://picsum.photos), un servicio gratuito de imágenes con URLs estables.
// Los nombres y descripciones de las categorías se muestran a los usuarios, por eso están en castellano.
//
// Uso: npm run seed:rooms

import {sequelize} from '../config/database';
import {Room, RoomCategory} from '../entities';

const photos = (seeds: string[]) => seeds.map((seed) => `https://picsum.photos/seed/${seed}/800/600`);

interface SampleRoom {
  number: number;
  floor: number;
}

const CATEGORIES = [
  {
    name: 'Estándar',
    description: 'Habitación cómoda y luminosa, ideal para estadías cortas.',
    capacity: 2,
    pricePerNight: 15000,
    imageUrls: photos(['hotel-estandar-1', 'hotel-estandar-2']),
    rooms: [
      {number: 101, floor: 1},
      {number: 102, floor: 1},
      {number: 103, floor: 1}
    ]
  },
  {
    name: 'Doble Superior',
    description: 'Habitación amplia con dos camas, pensada para familias o grupos.',
    capacity: 4,
    pricePerNight: 22000,
    imageUrls: photos(['hotel-doble-1', 'hotel-doble-2']),
    rooms: [
      {number: 201, floor: 2},
      {number: 202, floor: 2},
      {number: 203, floor: 2}
    ]
  },
  {
    name: 'Suite',
    description: 'Suite con living independiente y vista a la ciudad.',
    capacity: 3,
    pricePerNight: 35000,
    imageUrls: photos(['hotel-suite-1', 'hotel-suite-2', 'hotel-suite-3']),
    rooms: [
      {number: 301, floor: 3},
      {number: 302, floor: 3}
    ]
  }
];

const PRESIDENTIAL = {
  name: 'Presidential Suite',
  imageUrls: photos(['hotel-presidential-1', 'hotel-presidential-2', 'hotel-presidential-3']),
  rooms: [{number: 2801, floor: 28}]
};

async function createMissingRooms(categoryId: number, rooms: SampleRoom[]) {
  for (const room of rooms) {
    if (!(await Room.findOne({where: {number: room.number}}))) {
      await Room.create({number: room.number, floor: room.floor, categoryId});
      console.log(`  Room created: #${room.number}`);
    }
  }
}

async function main() {
  await sequelize.authenticate();

  for (const {rooms, ...data} of CATEGORIES) {
    let category = await RoomCategory.findOne({where: {name: data.name}});
    if (category) {
      console.log(`Category already existed: ${data.name} (left unchanged)`);
    } else {
      category = await RoomCategory.create(data);
      console.log(`Category created: ${data.name}`);
    }
    await createMissingRooms(category.id, rooms);
  }

  const presidential = await RoomCategory.findOne({where: {name: PRESIDENTIAL.name}});
  if (presidential) {
    if (!presidential.imageUrls || presidential.imageUrls.length === 0) {
      await presidential.update({imageUrls: PRESIDENTIAL.imageUrls});
      console.log('Photos added to Presidential Suite');
    }
    await createMissingRooms(presidential.id, PRESIDENTIAL.rooms);
  }

  console.log('Done.');
  await sequelize.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
