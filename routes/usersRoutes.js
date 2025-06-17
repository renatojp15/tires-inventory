const express = require('express');
const router = express.Router();
const userRegisterController = require('../controllers/UserRegisterController');

router.get('/register', userRegisterController.userRegisterForm);
router.post('/create', userRegisterController.createUser);

module.exports = router;