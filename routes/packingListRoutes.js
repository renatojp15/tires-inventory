const express = require('express');
const router = express.Router();
const packingListController = require('../controllers/PackingListController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/list', isAuthenticated, packingListController.list);
router.get('/form', isAuthenticated, packingListController.form);
router.post('/create', isAuthenticated, packingListController.create);
router.get('/view/:id', isAuthenticated, packingListController.view);
router.get('/export/:id', isAuthenticated, packingListController.exportToExcel);
router.post('/delete/:id', isAuthenticated, packingListController.delete);

module.exports = router;