function isAuthenticated(req, res, next) {
  if (req.session.user) {
    res.locals.currentUser = req.session.user;
    next();
  } else {
    res.redirect('/login');
  }
}

module.exports = isAuthenticated;