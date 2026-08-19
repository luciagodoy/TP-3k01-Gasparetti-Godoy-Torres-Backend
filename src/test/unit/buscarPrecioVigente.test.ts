import { describe, it, expect, beforeEach } from 'vitest';
import { buscarPrecioVigente } from '../../controllers/controladorPrecioServicio';
import Servicio from '../../models/Servicio';
import PrecioServicio from '../../models/PrecioServicio';

describe('buscarPrecioVigente', () => {
  let servicioId: number;

  beforeEach(async () => {
    const servicio = await Servicio.create({ nombre: 'Desayuno', descripcion: null });
    servicioId = servicio.id;
  });

  it('devuelve null si el servicio no tiene ningún precio cargado', async () => {
    const precio = await buscarPrecioVigente(servicioId, '2026-06-01');
    expect(precio).toBeNull();
  });

  it('ignora un precio cuya vigencia todavía no empezó', async () => {
    await PrecioServicio.create({
      precio: 1000,
      fechaVigenciaDesde: '2026-07-01',
      fechaVigenciaHasta: null,
      servicioId
    });

    const precio = await buscarPrecioVigente(servicioId, '2026-06-01');
    expect(precio).toBeNull();
  });

  it('ignora un precio cuya vigencia ya terminó', async () => {
    await PrecioServicio.create({
      precio: 1000,
      fechaVigenciaDesde: '2026-01-01',
      fechaVigenciaHasta: '2026-03-01',
      servicioId
    });

    const precio = await buscarPrecioVigente(servicioId, '2026-06-01');
    expect(precio).toBeNull();
  });

  it('devuelve el precio vigente sin fecha de fin (vigencia abierta)', async () => {
    await PrecioServicio.create({
      precio: 1500,
      fechaVigenciaDesde: '2026-01-01',
      fechaVigenciaHasta: null,
      servicioId
    });

    const precio = await buscarPrecioVigente(servicioId, '2026-06-01');
    expect(precio?.precio).toBe(1500);
  });

  it('cuando hay varios precios vigentes simultáneos, gana el de inicio de vigencia más reciente', async () => {
    await PrecioServicio.create({
      precio: 1000,
      fechaVigenciaDesde: '2026-01-01',
      fechaVigenciaHasta: null,
      servicioId
    });
    await PrecioServicio.create({
      precio: 1200,
      fechaVigenciaDesde: '2026-05-01',
      fechaVigenciaHasta: null,
      servicioId
    });

    const precio = await buscarPrecioVigente(servicioId, '2026-06-01');
    expect(precio?.precio).toBe(1200);
  });
});
