import {ErrorRequestHandler, RequestHandler} from 'express';
import {ForeignKeyConstraintError, UniqueConstraintError, ValidationError} from 'sequelize';
import {AppError, errorDetail} from '../shared/errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({error: 'Recurso no encontrado'});
};

// Single place that turns errors into HTTP responses. Express 5 forwards
// rejected promises from async handlers here, so controllers need no try/catch.
// Response shape: { error, message?, details? } where `message` explains the
// error to the user and `details` is debug information (never in production).
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({error: error.message, ...(error.detail && {message: error.detail})});
    return;
  }
  // Must be checked before ValidationError: it is a subclass of it.
  if (error instanceof UniqueConstraintError) {
    res.status(409).json({error: 'Ya existe un registro con esos datos', details: errorDetail(error)});
    return;
  }
  if (error instanceof ValidationError) {
    res.status(400).json({error: 'Datos inválidos', details: errorDetail(error)});
    return;
  }
  if (error instanceof ForeignKeyConstraintError) {
    res.status(400).json({
      error: 'Operación inválida',
      message: 'Hace referencia a un registro que no existe, o tiene registros asociados.',
      details: errorDetail(error)
    });
    return;
  }
  // Malformed JSON body (rejected by express.json()).
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({error: 'El cuerpo de la petición no es un JSON válido'});
    return;
  }

  // The request line tells which call failed when reading production logs.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({error: 'Error interno del servidor', details: errorDetail(error)});
};
