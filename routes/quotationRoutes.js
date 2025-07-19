const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/QuotationController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, quotationController.quotationForm);
router.post('/create', isAuthenticated, quotationController.createQuotation);
router.get('/list', isAuthenticated, quotationController.listQuotations);
router.get('/view/:id', isAuthenticated, quotationController.viewQuotation);

module.exports = router;