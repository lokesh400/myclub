function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function requireRole(role) {
  return function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === role) return next();
    if (role === 'admin' && req.user.role === 'superadmin') return next();
    return res.status(403).send('Forbidden');
  };
}

module.exports = { ensureAuthenticated, requireRole };
