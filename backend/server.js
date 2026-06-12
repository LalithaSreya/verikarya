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
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Root endpoint for health check and diagnostics
app.get('/', (req, res) => {
  try {
    const getRoutes = (app) => {
      const routes = [];
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              const path = handler.route.path;
              const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
              const baseMatch = middleware.regexp.toString().match(/^\/\^\\(\/.+?)\\\/\?\(\?\=\\\/\|\$\)/);
              const base = baseMatch ? baseMatch[1] : '';
              routes.push(`${methods} ${base}${path}`);
            }
          });
        }
      });
      return routes;
    };

    const fs = require('fs');
    const path = require('path');
    const filesInBackend = fs.readdirSync(__dirname);
    const routesPath = path.join(__dirname, 'routes');
    const filesInRoutes = fs.existsSync(routesPath) ? fs.readdirSync(routesPath) : [];
    
    let taskRoutesContent = '';
    const trFile = path.join(routesPath, 'taskRoutes.js');
    if (fs.existsSync(trFile)) {
      taskRoutesContent = fs.readFileSync(trFile, 'utf8');
    }

    res.status(200).json({
      message: 'VeriKarya API is running successfully',
      timestamp: new Date(),
      filesInBackend,
      filesInRoutes,
      taskRoutesContent: taskRoutesContent.split('\n'),
      routes: getRoutes(app)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
