const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Not authenticated. Please log in with your Employee ID.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.employee = payload; // { id, employeeId, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

module.exports = { requireAuth };
