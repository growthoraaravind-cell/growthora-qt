const express = require('express');
const router = express.Router();
const { createEmployee, getMe } = require('../controllers/employeeController');
const { requireAuth } = require('../middleware/auth');

router.post('/', createEmployee);
router.get('/me', requireAuth, getMe);

module.exports = router;
