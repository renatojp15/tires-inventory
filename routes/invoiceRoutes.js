const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/InvoiceController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/new', isAuthenticated, invoiceController.showInvoiceForm);
router.post('/create', isAuthenticated, invoiceController.createInvoice);
router.get('/list', invoiceController.listInvoices);
router.get('/:id', isAuthenticated, invoiceController.showInvoice);
router.get('/pdf/:id', isAuthenticated, invoiceController.exportInvoicePdf);
router.get('/:id/export-excel', isAuthenticated, invoiceController.exportInvoiceToExcel);
router.post('/:id/delete', isAuthenticated, invoiceController.deleteInvoice);

module.exports = router;