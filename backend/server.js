const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
// Enable CORS for our React frontend (running on Vite, typically port 5173)
app.use(cors({
  origin: '*', // Allow all in MVP, but can restrict to frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser - set a higher limit since we are uploading base64 camera images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded image evidence statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routers
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/visits', require('./routes/visitRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));

// Root endpoint for health check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'VeriKarya API is running successfully' });
});

// Port configuration
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
