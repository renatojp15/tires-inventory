const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const userLogin = {
  // Muestra el formulario de login
  loginForm: (req, res) => {
    try {
      res.render('login/UserLoginForm');
    } catch (error) {
      console.error('ERROR AL CARGAR EL FORMULARIO DE LOGIN:', error);
      res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE LOGIN');
    }
  },

  // Procesa el login
  loginUser: async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Buscar usuario sin distinguir mayúsculas/minúsculas
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim().toLowerCase(),
          mode: 'insensitive' // 👈 esta línea es la clave
        }
      }
    });

    if (!user) {
      return res.status(401).send('Usuario no encontrado');
    }

    // 2. Comparar contraseñas
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send('Contraseña incorrecta');
    }

    // 3. Guardar usuario en sesión
    req.session.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };

    res.redirect('/users/dashboard');
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
