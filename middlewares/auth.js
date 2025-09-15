function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');

    // If user's role matches any allowed role
    if (roles.includes(req.user.role)) return next();

    // Special case: superadmin can access all admin routes
    if (roles.includes('admin') && req.user.role === 'superadmin') return next();

    return res.status(403).send('Forbidden');
  };
}


module.exports = { ensureAuthenticated, requireRole };
