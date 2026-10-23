import PDFDocument from 'pdfkit';
import {Reservation} from '../entities';

const COLUMNS = {concept: 50, quantity: 280, unitPrice: 350, subtotal: 450};
const LINE_END = 550;

// Escribe el comprobante de pago de una reserva con check-out en `output` (una respuesta
// HTTP, un archivo...).
export function renderReceiptPdf(reservation: Reservation, output: NodeJS.WritableStream): void {
  const room = reservation.room;
  const user = reservation.guest?.user;
  const consumptions = reservation.consumedAmenities ?? [];

  const doc = new PDFDocument({size: 'A4', margin: 50});
  doc.pipe(output);

  doc.fontSize(18).text('Hotel DSW', {align: 'center'});
  doc.fontSize(12).text('Comprobante de Pago', {align: 'center'});
  doc.moveDown();
  doc
    .fontSize(10)
    .text(`Comprobante N°: ${reservation.id}`, {align: 'right'})
    .text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, {align: 'right'});
  doc.moveDown();

  doc.fontSize(12).text('Datos de la reserva', {underline: true});
  doc.fontSize(10).moveDown(0.5);
  doc.text(`Huésped: ${user?.username ?? reservation.guestId}`);
  doc.text(`Habitación: N° ${room?.number ?? reservation.roomId}${room ? ` (Piso ${room.floor})` : ''}`);
  doc.text(`Check-in: ${reservation.startDate}    Check-out: ${reservation.endDate}`);
  doc.moveDown();

  doc.fontSize(12).text('Detalle de consumos', {underline: true});
  doc.moveDown(0.5);
  doc.fontSize(10);
  writeRow(doc, ['Concepto', 'Cant.', 'P. Unitario', 'Subtotal']);
  doc.moveDown(0.5);
  doc.moveTo(COLUMNS.concept, doc.y).lineTo(LINE_END, doc.y).stroke();
  doc.moveDown(0.5);

  const lodging = Number(reservation.totalAmount);
  let total = lodging;
  writeRow(doc, [`Alojamiento (${reservation.startDate} a ${reservation.endDate})`, '1', lodging.toFixed(2), lodging.toFixed(2)]);
  doc.moveDown();

  for (const consumption of consumptions) {
    const amount = Number(consumption.totalAmount);
    total += amount;
    const name = consumption.quota?.amenity?.name ?? `Servicio #${consumption.quotaId}`;
    writeRow(doc, [name, String(consumption.quantity), Number(consumption.unitPrice).toFixed(2), amount.toFixed(2)]);
    doc.moveDown();
  }

  doc.moveDown(0.5);
  doc.moveTo(COLUMNS.concept, doc.y).lineTo(LINE_END, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Total: $ ${total.toFixed(2)}`, {align: 'right'});
  doc.moveDown(2);
  doc.fontSize(10).text('Gracias por su estadía.', {align: 'center'});

  doc.end();
}

function writeRow(doc: PDFKit.PDFDocument, [concept, quantity, unitPrice, subtotal]: string[]): void {
  const y = doc.y;
  doc.text(concept, COLUMNS.concept, y);
  doc.text(quantity, COLUMNS.quantity, y);
  doc.text(unitPrice, COLUMNS.unitPrice, y);
  doc.text(subtotal, COLUMNS.subtotal, y);
}
