const express = require('express');
const router = express.Router();
const habitacionController = require('../controllers/habitacionController');

// Ruta para obtener el listado con filtros
router.get('/buscar', habitacionController.listarHabitacionesFiltradas);

module.exports = router;