const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

function getTokenCookieOptions(req) {
  const isSecureRequest = req.secure || req.get('x-forwarded-proto') === 'https';
  return {
    httpOnly: true,
    sameSite: isSecureRequest ? 'none' : 'lax',
    secure: isSecureRequest,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

// POST /api/auth/login  { employeeId }
async function login(req, res) {
  try {
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: 'Employee ID is required.' });

    const employee = await Employee.findOne({ employeeId: employeeId.trim() });
    if (!employee) {
      return res.status(404).json({ message: 'No employee found with that ID. Check the ID or create a new one.' });
    }

    const token = jwt.sign(
      { id: employee._id, employeeId: employee.employeeId, name: employee.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res
      .cookie('token', token, getTokenCookieOptions(req))
      .json({ employee, token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'Login failed.' });
  }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie('token', getTokenCookieOptions(req)).json({ message: 'Logged out.' });
}

module.exports = { login, logout };
