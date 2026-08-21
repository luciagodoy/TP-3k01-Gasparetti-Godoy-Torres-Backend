// Carga Provincias y Ciudades de Argentina desde la API pública Georef
// (https://datosgobar.github.io/georef-ar-api/), para no tener que cargarlas a mano.
// Es seguro correrlo mas de una vez: usa ignoreDuplicates, no duplica filas.
//
// Uso: npm run seed:ubicaciones

import { sequelize } from '../config/database';
import Provincia from '../models/Provincia';
import Ciudad from '../models/Ciudad';

const GEOREF_BASE = 'https://apis.datos.gob.ar/georef/api';

interface ProvinciaGeoref {
  id: string;
  nombre: string;
}

interface LocalidadGeoref {
  nombre: string;
  provincia: { id: string; nombre: string };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error consultando ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function main() {
  await sequelize.authenticate();

  console.log('Descargando provincias desde la API Georef...');
  const { provincias: provinciasGeoref } = await fetchJson<{ provincias: ProvinciaGeoref[] }>(
    `${GEOREF_BASE}/provincias?campos=id,nombre&max=100`
  );

  console.log(`Insertando ${provinciasGeoref.length} provincias...`);
  await Provincia.bulkCreate(
    provinciasGeoref.map((p) => ({ nombre: p.nombre })) as any,
    { ignoreDuplicates: true }
  );

  const provinciasDb = await Provincia.findAll();
  const idPorNombreProvincia = new Map(
    provinciasDb.map((p) => [p.getDataValue('nombre') as string, p.getDataValue('id') as number])
  );

  console.log('Descargando localidades desde la API Georef (puede tardar unos segundos)...');
  const { localidades: localidadesGeoref } = await fetchJson<{ localidades: LocalidadGeoref[] }>(
    `${GEOREF_BASE}/localidades?campos=id,nombre,provincia&max=5000`
  );

  const ciudadesAInsertar = localidadesGeoref
    .map((l) => ({
      nombre: l.nombre,
      provinciaId: idPorNombreProvincia.get(l.provincia.nombre),
    }))
    .filter((c): c is { nombre: string; provinciaId: number } => c.provinciaId !== undefined);

  console.log(`Insertando ${ciudadesAInsertar.length} ciudades...`);
  await Ciudad.bulkCreate(ciudadesAInsertar as any, { ignoreDuplicates: true });

  console.log('Listo. Provincias y ciudades cargadas.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
