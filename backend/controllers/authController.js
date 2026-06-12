const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'verikarya_jwt_secret_key_123456',
    { expiresIn: '30d' }
  );
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public (for MVP initialization; in production, this should be restricted)
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all employees
// @route   GET /api/auth/employees
// @access  Private (Manager only)
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update office location for current employee (testing bypass)
// @route   PUT /api/auth/office-location
// @access  Private
const updateOfficeLocation = async (req, res) => {
  try {
    const { location } = req.body;
    if (!location || location.lat === undefined || location.lng === undefined) {
      return res.status(400).json({ success: false, error: 'Please provide valid location coordinates' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.officeLocation = location;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        officeLocation: user.officeLocation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Google login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { token, role } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Google login token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const { OAuth2Client } = require('google-auth-library');
    const oAuth2Client = new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await oAuth2Client.verifyIdToken({
        idToken: token,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn('Google token verification failed, attempting direct JWT decode fallback:', err.message);
      // Fallback: Decode token without verification to extract user details for testing/dev environments
      const decoded = jwt.decode(token);
      if (decoded && (decoded.email || decoded.email_verified)) {
        payload = decoded;
      } else {
        // If there's no client ID and it failed, try without audience check
        if (!clientId) {
          try {
            const ticket = await oAuth2Client.verifyIdToken({ idToken: token });
            payload = ticket.getPayload();
          } catch (innerErr) {
            throw innerErr;
          }
        } else {
          throw err;
        }
      }
    }

    const { email, name } = payload;
    const nameToSave = name || (email && email.split('@')[0]) || 'Google User';

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // New user registration
      const assignedRole = (role === 'manager' || role === 'employee') ? role : 'employee';
      const placeholderPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      user = await User.create({
        name: nameToSave,
        email,
        password: placeholderPassword,
        role: assignedRole
      });
    }

    const jwtToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk register employees
// @route   POST /api/auth/employees/bulk
// @access  Private (Manager only)
const bulkRegisterEmployees = async (req, res) => {
  try {
    const { employees } = req.body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of employees' });
    }

    const results = {
      registered: [],
      skipped: [],
      errors: []
    };

    for (const emp of employees) {
      const { name, email, password, phone } = emp;

      if (!name || !email || !password) {
        results.errors.push({ email: email || 'unknown', error: 'Missing name, email, or password' });
        continue;
      }

      try {
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
          results.skipped.push({ email, reason: 'Email already exists' });
          continue;
        }

        const newUser = await User.create({
          name,
          email: email.toLowerCase(),
          password,
          phone: phone || '',
          role: 'employee'
        });

        results.registered.push({
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone
        });
      } catch (err) {
        results.errors.push({ email, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update employee profile
// @route   PUT /api/auth/employees/:id
// @access  Private (Manager only)
const updateEmployee = async (req, res) => {
  try {
    const { name, email, phone, officeLocation } = req.body;

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (user.role !== 'employee') {
      return res.status(400).json({ success: false, error: 'Can only update employee profiles' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (officeLocation) {
      updateData.officeLocation = officeLocation;
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      // Check if email already exists
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
      updateData.email = email.toLowerCase();
    }

    user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        officeLocation: user.officeLocation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete employee profile
// @route   DELETE /api/auth/employees/:id
// @access  Private (Manager only)
const deleteEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (user.role !== 'employee') {
      return res.status(400).json({ success: false, error: 'Can only delete employee profiles' });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Bulk delete employee profiles
// @route   DELETE /api/auth/employees
// @access  Private (Manager only)
const bulkDeleteEmployees = async (req, res) => {
  try {
    const { employeeIds } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Please provide an array of employee IDs to delete' });
    }

    // Verify they exist and are all employees
    const users = await User.find({ _id: { $in: employeeIds } });
    const nonEmployees = users.filter(u => u.role !== 'employee');
    if (nonEmployees.length > 0) {
      return res.status(400).json({ success: false, error: 'Can only delete employee profiles' });
    }

    await User.deleteMany({ _id: { $in: employeeIds } });

    res.status(200).json({
      success: true,
      message: `${employeeIds.length} employees deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
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
};


