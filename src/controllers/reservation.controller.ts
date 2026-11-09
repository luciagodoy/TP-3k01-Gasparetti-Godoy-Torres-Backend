import {Request, Response} from 'express';
import {Reservation} from '../entities';
import {renderReceiptPdf} from '../services/receipt-pdf.service';
import {GuestReservationInput, reservationService, ReservationUpdate, StaffReservationInput} from '../services/reservation.service';
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
  res.setHeader('Content-Disposition', `attachment; filename="comprobante-reserva-${reservation.id}.pdf"`);
  renderReceiptPdf(reservation, res);
};

export const reservationController = {
  // --- Autoservicio del huésped ---

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

  // { early: true } confirma un check-in antes de las 15:00 del día de inicio.
  async checkIn(req: Request<{id: string}, {}, {early?: unknown}>, res: Response): Promise<void> {
    const reservation = await reservationService.checkIn(parseId(req.params.id), {early: req.body.early === true});
    res.json({message: 'Check-in realizado con éxito', reservation});
  },

  // Responde con el comprobante en PDF. { late: true } confirma un check-out tardío.
  async checkOut(req: Request<{id: string}, {}, {late?: unknown}>, res: Response): Promise<void> {
    sendReceipt(res, await reservationService.checkOut(parseId(req.params.id), {late: req.body.late === true}));
  },

  async downloadReceipt(req: Request<{id: string}>, res: Response): Promise<void> {
    sendReceipt(res, await reservationService.getReceipt(parseId(req.params.id)));
  }
};
