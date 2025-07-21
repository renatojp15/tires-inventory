const express = require('express');
const router = express.Router();
const customerController = require('../controllers/CustomerController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/form', isAuthenticated, customerController.customerForm);
router.post('/create', isAuthenticated, customerController.createCustomer);
router.get('/list', isAuthenticated, customerController.listCustomers);
router.get('/edit/:id', isAuthenticated, customerController.editCustomerForm);
router.post('/edit/:id', isAuthenticated, customerController.updateCustomer);
router.post('/delete/:id', isAuthenticated, customerController.deleteCustomer);

module.exports = router;