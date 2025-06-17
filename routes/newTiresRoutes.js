const express = require('express');
const router = express.Router();
const newTiresController = require('../controllers/NewTiresController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, newTiresController.newTiresForm);
router.post('/create', isAuthenticated, newTiresController.createNewTires);
router.get('/list', isAuthenticated, newTiresController.newTiresList);
router.get('/edit/:id', isAuthenticated, newTiresController.editNewTiresForm);
router.post('/edit/:id', isAuthenticated, newTiresController.updateNewTires);
router.delete('/:id', isAuthenticated, newTiresController.deleteNewTires);

module.exports = router;