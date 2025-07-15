const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/AlertsController');

router.get('/', alertsController.listAlerts);

module.exports = router;