const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
router.post('/', reservaController.crearReserva);

module.exports = router;