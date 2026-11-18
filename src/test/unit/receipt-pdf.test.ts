import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it, expect} from 'vitest';
import {Reservation} from '../../entities';
import {renderReceiptPdf} from '../../services/receipt-pdf.service';

const render = (reservation: Partial<Reservation>): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const pdf = renderReceiptPdf(reservation as Reservation);
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

describe('renderReceiptPdf', () => {
  it('writes a complete PDF with the stay and its amenities', async () => {
    const pdf = await render({
      id: 15,
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      totalAmount: 300,
      guestId: 1,
      roomId: 1,
      room: {number: 101, floor: 1} as Reservation['room'],
      consumedAmenities: [
        {quotaId: 1, quantity: 2, unitPrice: 5000, totalAmount: 20000, quota: {amenity: {name: 'Spa'}}}
      ] as unknown as Reservation['consumedAmenities']
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');
    expect(pdf.length).toBeGreaterThan(1024);
  });

  // Regresión: en Vercel faltaba la fuente porque pdfkit la carga con un require dinámico.
  // El import estático es lo que hace que entre en el bundle; si se borra, el comprobante
  // vuelve a fallar sólo en producción, donde los tests no corren.
  it('keeps the static import that puts the Helvetica font in the Vercel bundle', () => {
    const source = readFileSync(join(__dirname, '../../services/receipt-pdf.service.ts'), 'utf8');
    expect(source).toMatch(/^import 'pdfkit\/standard-fonts\/Helvetica';$/m);
  });
});
