const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { getPool } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const employerRoutes = require('./routes/employerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root & Health Check API
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
      <h1 style="color: #0A66C2;">🚀 Jobtimize Backend API is running!</h1>
      <p style="color: #555; font-size: 16px;">Để xem <strong>Giao diện Người dùng (Frontend)</strong>, vui lòng mở liên kết bên dưới:</p>
      <a href="http://localhost:3000" style="display: inline-block; padding: 12px 24px; background: #00B14F; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
        👉 Mở Giao diện Web tại http://localhost:3000
      </a>
      <p style="color: #888; margin-top: 30px; font-size: 13px;">API Health Check: <a href="/api/health">/api/health</a></p>
    </div>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Jobtimize AI Recruitment Platform',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/employer', employerRoutes);
app.use('/api/metadata', categoryRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi hệ thống nội bộ máy chủ'
  });
});

// Start Server and Test DB connection
app.listen(PORT, async () => {
  console.log(`🚀 Jobtimize Server is running on http://localhost:${PORT}`);
  try {
    await getPool();
  } catch (err) {
    console.warn('⚠️ Warning: MS SQL Server connection not ready yet. Please ensure SQL Server is running on port 1433 and JobtimizeDB database is created.');
  }
});
