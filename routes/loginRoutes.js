const express = require('express');
const router = express.Router();
const userLoginController = require('../controllers/UserLoginController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/', userLoginController.loginForm);
router.post('/', userLoginController.loginUser);
router.get('/logout', userLoginController.logoutUser);

module.exports = router;