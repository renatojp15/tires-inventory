const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/QuotationController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, quotationController.quotationForm);
router.post('/create', isAuthenticated, quotationController.createQuotation);
router.get('/list', isAuthenticated, quotationController.listQuotations);
router.get('/view/:id', isAuthenticated, quotationController.viewQuotation);
router.get('/accept/:id', isAuthenticated, quotationController.acceptQuotation);
router.get('/reject/:id', isAuthenticated, quotationController.rejectQuotation);
router.get('/export-excel/:id', isAuthenticated, quotationController.exportQuotationToExcel);
router.get('/print/:id', isAuthenticated, quotationController.getPrintTableQuotation);
router.post('/delete/:id', isAuthenticated, quotationController.deleteQuotation);

module.exports = router;