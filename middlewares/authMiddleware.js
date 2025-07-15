function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    // Exponer el usuario a todas las vistas EJS
    res.locals.currentUser = req.session.user;
    return next();
  }

  // Si viene de una página protegida, redirige con mensaje (opcional)
  res.redirect('/login');
}

module.exports = isAuthenticated;