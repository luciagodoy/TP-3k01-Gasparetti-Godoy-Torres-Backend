// Loads Argentina's provinces and cities from the public Georef API
// (https://datosgobar.github.io/georef-ar-api/) so they do not have to be typed in.
// Safe to run more than once: ignoreDuplicates never duplicates rows.
//
// Usage: npm run seed:locations

import {sequelize} from '../config/database';
import {City, Province} from '../entities';

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';

// Field names below belong to the external Georef API, so they stay as it sends them.
interface GeorefProvince {
  id: string;
  nombre: string;
}

interface GeorefLocality {
  nombre: string;
  provincia: {id: string; nombre: string};
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function main() {
  await sequelize.authenticate();

  console.log('Downloading provinces from the Georef API...');
  const {provincias: georefProvinces} = await fetchJson<{provincias: GeorefProvince[]}>(
    `${GEOREF_BASE}/provincias?campos=id,nombre&max=100`
  );

  console.log(`Inserting ${georefProvinces.length} provinces...`);
  await Province.bulkCreate(
    georefProvinces.map((province) => ({name: province.nombre})),
    {ignoreDuplicates: true}
  );

  const provinces = await Province.findAll();
  const provinceIdByName = new Map(provinces.map((province) => [province.name, province.id]));

  console.log('Downloading localities from the Georef API (may take a few seconds)...');
  const {localidades: georefLocalities} = await fetchJson<{localidades: GeorefLocality[]}>(
    `${GEOREF_BASE}/localidades?campos=id,nombre,provincia&max=5000`
  );

  const cities = georefLocalities
    .map((locality) => ({name: locality.nombre, provinceId: provinceIdByName.get(locality.provincia.nombre)}))
    .filter((city): city is {name: string; provinceId: number} => city.provinceId !== undefined);

  console.log(`Inserting ${cities.length} cities...`);
  await City.bulkCreate(cities, {ignoreDuplicates: true});

  console.log('Done. Provinces and cities loaded.');
  await sequelize.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
