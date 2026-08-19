import { describe, it, expect } from 'vitest';
import { calcularNoches } from '../../controllers/controladorReserva';

describe('calcularNoches', () => {
  it('cuenta las noches entre dos fechas DATEONLY', () => {
    expect(calcularNoches('2026-08-01', '2026-08-04')).toBe(3);
  });

  it('devuelve 0 cuando la fecha de fin es igual a la de inicio', () => {
    expect(calcularNoches('2026-08-01', '2026-08-01')).toBe(0);
  });

  it('devuelve un valor negativo cuando la fecha de fin es anterior a la de inicio', () => {
    expect(calcularNoches('2026-08-05', '2026-08-01')).toBe(-4);
  });

  it('no se desplaza un día por la zona horaria local (gotcha de Date + DATEONLY)', () => {
    // Si se parsearan como hora local en vez de UTC explícito, un huso horario
    // negativo podría restar un día y dar 30 en lugar de 31.
    expect(calcularNoches('2026-01-01', '2026-02-01')).toBe(31);
  });
});
