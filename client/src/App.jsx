import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Common Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import SkillGapAnalysisPage from './pages/candidate/SkillGapAnalysisPage';
import EmployerDashboard from './pages/employer/EmployerDashboard';
import PostJobPage from './pages/employer/PostJobPage';
import EmployerATSPage from './pages/employer/EmployerATSPage';

// Route Guards
const ProtectedCandidateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'Candidate') return <Navigate to="/login" replace />;
  return children;
};

const ProtectedEmployerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'Employer') return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col justify-between">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />

              {/* Candidate Routes */}
              <Route
                path="/candidate/dashboard"
                element={
                  <ProtectedCandidateRoute>
                    <CandidateDashboard />
                  </ProtectedCandidateRoute>
                }
              />
              <Route
                path="/candidate/skill-gap"
                element={
                  <ProtectedCandidateRoute>
                    <SkillGapAnalysisPage />
                  </ProtectedCandidateRoute>
                }
              />

              {/* Employer Routes */}
              <Route
                path="/employer/dashboard"
                element={
                  <ProtectedEmployerRoute>
                    <EmployerDashboard />
                  </ProtectedEmployerRoute>
                }
              />
              <Route
                path="/employer/post-job"
                element={
                  <ProtectedEmployerRoute>
                    <PostJobPage />
                  </ProtectedEmployerRoute>
                }
              />
              <Route
                path="/employer/ats/:jobId"
                element={
                  <ProtectedEmployerRoute>
                    <EmployerATSPage />
                  </ProtectedEmployerRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
