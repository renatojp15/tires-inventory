const express = require('express');
const router = express.Router();
const userLoginController = require('../controllers/UserLoginController');
const isAuthenticated = require('../middlewares/authMiddleware');

router.get('/', userLoginController.loginForm);
router.post('/', userLoginController.loginUser);
router.get('/logout', userLoginController.logoutUser);
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('Dashboard', { user: req.session.user });
});

module.exports = router;