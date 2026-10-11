const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { validateJwtConfig } = require('./utils/authHelper');

// Fail-fast startup validation: Ensure JWT_SECRET is configured before launching server
try {
  validateJwtConfig();
} catch (err) {
  console.error('❌ LỖI KHỞI ĐỘNG SERVER:', err.message);
  process.exit(1);
}

const { getPool, executeQuery } = require('./config/db');
const { authenticate } = require('./middleware/authMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const employerRoutes = require('./routes/employerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Protected Route: Prevent unauthorized public access to legal KYC documents (UC-E04)
app.get('/uploads/kyc/:filename', authenticate, async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../uploads/kyc', safeFilename);

    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Tệp tài liệu không tồn tại' });
    }

    // Admin has audit access to all KYC documents
    if (req.user && req.user.role === 'Admin') {
      return res.sendFile(filePath);
    }

    // Employer can only view documents belonging to their own company
    if (req.user && req.user.role === 'Employer') {
      const empRes = await executeQuery('SELECT EmployerID FROM Employers WHERE UserID = @UserID', { UserID: req.user.userId });
      if (empRes.recordset && empRes.recordset.length > 0) {
        const empId = empRes.recordset[0].EmployerID;
        const docRes = await executeQuery(
          `SELECT DocumentID FROM KYCDocuments 
           WHERE EmployerID = @EmployerID 
             AND (BusinessLicenseUrl LIKE '%' + @Filename OR TaxCertificateUrl LIKE '%' + @Filename)`,
          { EmployerID: empId, Filename: safeFilename }
        );
        if (docRes.recordset && docRes.recordset.length > 0) {
          return res.sendFile(filePath);
        }
      }
    }

    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập vào tài liệu pháp lý này' });
  } catch (error) {
    console.error('KYC file access error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Static folder for public uploaded files (logos, avatars, etc.)
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
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

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
