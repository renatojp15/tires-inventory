const express = require('express');
const router = express.Router();
const tireTypeController = require('../controllers/TireTypeController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, tireTypeController.form);
router.post('/create', isAuthenticated, tireTypeController.create);
router.get('/list', isAuthenticated, tireTypeController.list);
router.get('/edit/:id', isAuthenticated, tireTypeController.editForm);
router.post('/edit/:id', isAuthenticated, tireTypeController.update);
router.post('/delete/:id', isAuthenticated, tireTypeController.delete)

module.exports = router;