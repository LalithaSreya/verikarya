const express = require('express');
const { register, login, getMe, getEmployees, updateOfficeLocation } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/employees', protect, authorize('manager'), getEmployees);
router.put('/office-location', protect, updateOfficeLocation);

module.exports = router;


