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
  bulkDeleteEmployees
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);
router.get('/employees', protect, authorize('manager'), getEmployees);
router.post('/employees/bulk', protect, authorize('manager'), bulkRegisterEmployees);
router.delete('/employees', protect, authorize('manager'), bulkDeleteEmployees);
router.put('/employees/:id', protect, authorize('manager'), updateEmployee);
router.delete('/employees/:id', protect, authorize('manager'), deleteEmployee);
router.put('/office-location', protect, updateOfficeLocation);

module.exports = router;


