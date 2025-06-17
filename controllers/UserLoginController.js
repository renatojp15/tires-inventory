const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const userLogin = {
  // Muestra el formulario de login
  loginForm: (req, res) => {
    try {
      res.render('forms/UserLoginForm');
    } catch (error) {
      console.error('ERROR AL CARGAR EL FORMULARIO DE LOGIN:', error);
      res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE LOGIN');
    }
  },

  // Procesa el login
  loginUser: async (req, res) => {
    const { username, password } = req.body;

    try {
      // 1. Buscar usuario por username
      const user = await prisma.user.findUnique({ where: { username } });

      if (!user) {
        return res.status(401).send('Usuario no encontrado');
      }

      // 2. Comparar contraseñas
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).send('Contraseña incorrecta');
      }

      // 3. Guardar usuario en sesión (si usas express-session)
      req.session.user = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      };

      res.redirect('/login/dashboard'); // o redirige a un dashboard
    } 
    catch (error) {
      console.error('ERROR AL INICIAR SESIÓN:', error);
      res.status(500).send('ERROR AL INICIAR SESIÓN');
    }
  },
  logoutUser: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('ERROR AL CERRAR SESIÓN:', err);
      }
      res.redirect('/login');
    });
  }
};

module.exports = userLogin;
