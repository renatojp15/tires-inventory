function isAdmin(req, res, next) {
  const user = req.session?.user;

  if (user && user.role === 'Administrador') {
    return next();
  }

  // Opción: puedes redirigir a una página de acceso denegado amigable
  return res.status(403).render('errors/403', {
    message: 'Acceso denegado: solo para administradores',
    user
  });
}

module.exports = isAdmin;