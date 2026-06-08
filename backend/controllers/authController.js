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

    let ticket;
    try {
      ticket = await oAuth2Client.verifyIdToken({
        idToken: token,
        audience: clientId
      });
    } catch (err) {
      if (!clientId) {
        console.warn('Google Client ID not configured. Verifying token without audience check.');
        ticket = await oAuth2Client.verifyIdToken({
          idToken: token
        });
      } else {
        throw err;
      }
    }

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // New user registration
      const assignedRole = (role === 'manager' || role === 'employee') ? role : 'employee';
      const placeholderPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      user = await User.create({
        name,
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

module.exports = {
  register,
  login,
  googleLogin,
  getMe,
  getEmployees,
  updateOfficeLocation
};


