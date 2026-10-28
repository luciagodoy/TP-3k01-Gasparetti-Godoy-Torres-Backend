import {ErrorRequestHandler, RequestHandler} from 'express';
import {ForeignKeyConstraintError, UniqueConstraintError, ValidationError} from 'sequelize';
import {AppError, errorDetail, InvalidFieldsError} from '../shared/errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({error: 'Recurso no encontrado'});
};

// Único lugar que convierte errores en respuestas HTTP. Express 5 reenvía acá las
// promesas rechazadas de los handlers async, así que los controladores no necesitan try/catch.
// Forma de la respuesta: { error, message?, code?, fields?, details? } donde `fields` trae
// el mensaje de cada campo inválido de un formulario, `message` le explica el
// error al usuario y `details` es información de depuración (nunca en producción).
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: error.message,
      ...(error.detail && {message: error.detail}),
      ...(error.code && {code: error.code}),
      ...(error instanceof InvalidFieldsError && {fields: error.fields})
    });
    return;
  }
  // Debe verificarse antes que ValidationError: es una subclase de ese.
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

  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({error: 'El cuerpo de la petición no es un JSON válido'});
    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);
  res.status(500).json({error: 'Error interno del servidor', details: errorDetail(error)});
};
