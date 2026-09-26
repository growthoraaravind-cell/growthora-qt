const Employee = require('../models/Employee');
const { getNextSequence } = require('../models/Counter');

// POST /api/employees
async function createEmployee(req, res) {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Name, email and phone are all required.' });
    }

    const seq = await getNextSequence('employeeId');
    const employeeId = `Growthora${String(seq + 10).padStart(3, '0')}`; // starts at Growthora011

    const employee = await Employee.create({ name: name.trim(), email: email.trim(), phone: phone.trim(), employeeId });

    res.status(201).json({ employee });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'That employee ID already exists. Please try again.' });
    }
    console.error('[createEmployee]', err);
    res.status(500).json({ message: 'Could not create employee ID.' });
  }
}

// GET /api/employees/me
async function getMe(req, res) {
  try {
    const employee = await Employee.findById(req.employee.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });
    res.json({ employee });
  } catch (err) {
    console.error('[getMe]', err);
    res.status(500).json({ message: 'Could not fetch employee.' });
  }
}

module.exports = { createEmployee, getMe };
