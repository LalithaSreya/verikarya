const express = require('express');
const { 
  register, 
  login, 
  googleLogin, 
  getMe, 
  getEmployees, 
  updateOfficeLocation,
  bulkRegisterEmployees,
  updateEmployee,
  deleteEmployee,
  bulkDeleteEmployees,
  seedDatabase
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/config', (req, res) => {
  const isConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);
  res.status(200).json({
    success: true,
    twilioSimulationMode: !isConfigured
  });
});
router.get('/me', protect, getMe);
router.get('/employees', protect, authorize('manager'), getEmployees);
router.post('/employees/bulk', protect, authorize('manager'), bulkRegisterEmployees);
router.delete('/employees', protect, authorize('manager'), bulkDeleteEmployees);
router.put('/employees/:id', protect, authorize('manager'), updateEmployee);
router.delete('/employees/:id', protect, authorize('manager'), deleteEmployee);
router.put('/office-location', protect, updateOfficeLocation);
router.post('/seed', protect, authorize('manager'), seedDatabase);

module.exports = router;


