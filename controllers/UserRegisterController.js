const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const userRegister = {
  // Mostrar formulario de registro
  userRegisterForm: async (req, res) => {
    try {
      const roles = await prisma.role.findMany();
      res.render('users/UserRegisterForm', { roles });
    } catch (error) {
      console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
      res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
    }
  },

  // Crear usuario
createUser: async (req, res) => {
  let { username, fullName, role, password, confirmPassword } = req.body;

  // Normalizar el username a minúsculas
  username = username.trim().toLowerCase();

  // Validar contraseñas iguales
  if (password !== confirmPassword) {
    return res.status(400).send('❌ Las contraseñas no coinciden');
  }

  // Validar mínimo de caracteres
  if (password.length < 6) {
    return res.status(400).send('❌ La contraseña debe tener al menos 6 caracteres');
  }

  try {
    // Verificar si ya existe un usuario con ese username (sin importar mayúsculas)
    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive',
        }
      }
    });

    if (existingUser) {
      return res.status(400).send('❌ Ese nombre de usuario ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await prisma.user.create({
      data: {
        username,
        fullName,
        role,
        password: hashedPassword
      }
    });

    res.redirect('/login');
  } catch (error) {
    console.error('ERROR AL REGISTRAR USUARIO:', error);
    res.status(500).send('ERROR AL REGISTRAR USUARIO');
  }
},
    listUsers: async (req, res) => {
        try {
            const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
            res.render('users/List', { users });
        } catch (error) {
            console.error('ERROR AL LISTAR USUARIOS:', error);
            res.status(500).send('ERROR AL LISTAR USUARIOS');
  }
},
  // Mostrar formulario para editar un usuario
  editUserForm: async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        return res.status(404).send('Usuario no encontrado');
      }

      res.render('users/EditUserForm', { user });
    } catch (error) {
      console.error('ERROR AL CARGAR FORMULARIO DE EDICIÓN:', error);
      res.status(500).send('ERROR AL CARGAR FORMULARIO DE EDICIÓN');
    }
  },

  // Actualizar usuario
  // Actualizar usuario
updateUser: async (req, res) => {
  const userId = parseInt(req.params.id);
  let { username, fullName, role, password, confirmPassword } = req.body;

  username = username.trim().toLowerCase();

  try {
    // Verificar si otro usuario ya tiene ese username (insensible a mayúsculas)
    const userWithSameUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive'
        },
        NOT: { id: userId }
      }
    });

    if (userWithSameUsername) {
      return res.status(400).send('❌ El nombre de usuario ya está en uso por otro usuario');
    }

    const updatedData = { username, fullName, role };

    // Si se quiere actualizar la contraseña
    if (password && password.trim() !== '') {
      if (password !== confirmPassword) {
        return res.status(400).send('❌ Las contraseñas no coinciden');
      }

      if (password.length < 6) {
        return res.status(400).send('❌ La contraseña debe tener al menos 6 caracteres');
      }

      updatedData.password = await bcrypt.hash(password, saltRounds);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updatedData,
    });

    res.redirect('/users/list');
  } catch (error) {
    console.error('ERROR AL ACTUALIZAR USUARIO:', error);
    res.status(500).send('ERROR AL ACTUALIZAR USUARIO');
  }
},
  // Eliminar usuario
  deleteUser: async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      await prisma.user.delete({ where: { id: userId } });
      res.redirect('/users/list');
    } catch (error) {
      console.error('ERROR AL ELIMINAR USUARIO:', error);
      res.status(500).send('ERROR AL ELIMINAR USUARIO');
    }
  },
};

module.exports = userRegister;