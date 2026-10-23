import {Request, Response} from 'express';
import {Reservation} from '../entities';
import {renderReceiptPdf} from '../services/receipt-pdf.service';
import {
  GuestReservationInput,
  reservationService,
  ReservationUpdate,
  StaffReservationInput
} from '../services/reservation.service';
import {optionalNumber, parseId} from '../shared/http';

interface ListReservationsQuery {
  guestId?: string;
  roomId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

const sendReceipt = (res: Response, reservation: Reservation): void => {
  res.setHeader('Content-Type', 'application/pdf');
  // The file name is what the guest sees when saving it.
  res.setHeader('Content-Disposition', `attachment; filename="comprobante-reserva-${reservation.id}.pdf"`);
  renderReceiptPdf(reservation, res);
};

export const reservationController = {
  // --- Guest self-service ---

  async createMine(req: Request<{}, {}, GuestReservationInput>, res: Response): Promise<void> {
    const reservation = await reservationService.createForGuest(req.user!.id, req.body);
    res.status(201).json({message: '¡Reserva realizada con éxito!', reservation});
  },

  async listMine(req: Request, res: Response): Promise<void> {
    res.json(await reservationService.listForGuest(req.user!.id));
  },

  async cancelMine(req: Request<{id: string}>, res: Response): Promise<void> {
    const reservation = await reservationService.cancelForGuest(req.user!.id, parseId(req.params.id));
    res.json({message: 'Reserva cancelada correctamente', reservation});
  },

  // --- Staff ---

  async create(req: Request<{}, {}, StaffReservationInput>, res: Response): Promise<void> {
    const reservation = await reservationService.create(req.body);
    res.status(201).json({message: '¡Reserva realizada con éxito!', reservation});
  },

  async list(req: Request<{}, {}, {}, ListReservationsQuery>, res: Response): Promise<void> {
    const {guestId, roomId, status, startDate, endDate} = req.query;
    res.json(
      await reservationService.list({
        guestId: optionalNumber(guestId),
        roomId: optionalNumber(roomId),
        status,
        startDate,
        endDate
      })
    );
  },

  async getById(req: Request<{id: string}>, res: Response): Promise<void> {
    res.json(await reservationService.getWithDetails(parseId(req.params.id)));
  },

  async update(req: Request<{id: string}, {}, ReservationUpdate>, res: Response): Promise<void> {
    res.json(await reservationService.update(parseId(req.params.id), req.body));
  },

  async remove(req: Request<{id: string}>, res: Response): Promise<void> {
    await reservationService.remove(parseId(req.params.id));
    res.status(204).send();
  },

  async checkIn(req: Request<{id: string}>, res: Response): Promise<void> {
    const reservation = await reservationService.checkIn(parseId(req.params.id));
    res.json({message: 'Check-in realizado con éxito', reservation});
  },

  // Answers with the PDF receipt.
  async checkOut(req: Request<{id: string}>, res: Response): Promise<void> {
    sendReceipt(res, await reservationService.checkOut(parseId(req.params.id)));
  },

  async downloadReceipt(req: Request<{id: string}>, res: Response): Promise<void> {
    sendReceipt(res, await reservationService.getReceipt(parseId(req.params.id)));
  }
};
