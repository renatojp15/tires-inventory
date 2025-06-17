const express = require('express');
const router = express.Router();
const usedTiresController = require('../controllers/UsedTiresController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, usedTiresController.UsedTiresForm);
router.post('/create', isAuthenticated, usedTiresController.createUsedTires);
router.get('/list', isAuthenticated, usedTiresController.usedTiresList);
router.get('/edit/:id', isAuthenticated, usedTiresController.editUsedTiresForm);
router.post('/edit/:id', isAuthenticated, usedTiresController.updateUsedTires);
router.delete('/:id', isAuthenticated, usedTiresController.deleteUsedTires);

module.exports = router;