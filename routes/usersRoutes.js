const express = require('express');
const router = express.Router();
const userRegisterController = require('../controllers/UserRegisterController');
const isAuthenticated = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');

router.get('/register', userRegisterController.userRegisterForm);
router.post('/create', userRegisterController.createUser);
router.get('/list', isAuthenticated, isAdmin, userRegisterController.listUsers);
router.get('/:id/edit', isAuthenticated, isAdmin, userRegisterController.editUserForm);
router.post('/:id/edit', isAuthenticated, isAdmin, userRegisterController.updateUser);
router.post('/:id/delete', isAuthenticated, isAdmin, userRegisterController.deleteUser);
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('Dashboard', { user: req.session.user });
});

module.exports = router;