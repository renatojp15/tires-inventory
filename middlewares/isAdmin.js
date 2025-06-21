function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next(); // ✅ Usuario autenticado y con rol admin
  } else {
    res.status(403).send('Acceso denegado: solo para administradores');
  }
}

module.exports = isAdmin;