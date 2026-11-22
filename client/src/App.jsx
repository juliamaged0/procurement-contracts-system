import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NeedsRequest from './pages/NeedsRequest';
import FinancialReview from './pages/FinancialReview';
import AuthorityApproval from './pages/AuthorityApproval';
import Tenders from './pages/Tenders';
import EnvelopeOpening from './pages/EnvelopeOpening';
import Evaluation from './pages/Evaluation';
import Awarding from './pages/Awarding';
import VendorRegistry from './pages/VendorRegistry';
import OfficialReports from './pages/OfficialReports';
import Archive from './pages/Archive';
import AuditTrail from './pages/AuditTrail';
import UserManagement from './pages/UserManagement';
import SubFileDistribution from './pages/SubFileDistribution';
import { ShieldAlert } from 'lucide-react';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400">جاري التحقق من الجلسة والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role permission
  if (allowedRoles && allowedRoles.length > 0 && user.role !== 'Admin' && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-12 text-center space-y-4 bg-white rounded-2xl border border-rose-200 shadow-sm max-w-lg mx-auto mt-12">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">عفواً! ليس لديك صلاحية الوصول لهذه الشاشة</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          حسابك الحالي مسجل بدور ({user.role}) وهو غير مصرح له بفتح هذه الصفحة. يرجى مراجعة مسؤول النظام.
        </p>
      </div>
    );
  }

  return children;
}

// App Layout with Sidebar and Navbar
function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected System Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* ===== WORKFLOW PAGES (New) ===== */}
          <Route
            path="/needs-request"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NeedsRequest />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/financial-review"
            element={<Navigate to="/needs-request" replace />}
          />

          <Route
            path="/authority-approval"
            element={<Navigate to="/needs-request" replace />}
          />

          {/* ===== EXISTING PAGES ===== */}
          <Route
            path="/tenders"
            element={
              <ProtectedRoute allowedRoles={['TenderOfficer']}>
                <MainLayout>
                  <Tenders />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/envelope-opening"
            element={
              <ProtectedRoute allowedRoles={['CommitteeMember']}>
                <MainLayout>
                  <EnvelopeOpening />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/evaluation"
            element={
              <ProtectedRoute allowedRoles={['CommitteeMember']}>
                <MainLayout>
                  <Evaluation />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/awarding"
            element={
              <ProtectedRoute allowedRoles={['FinancialAuditor']}>
                <MainLayout>
                  <Awarding />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendors"
            element={
              <ProtectedRoute allowedRoles={['VendorManager']}>
                <MainLayout>
                  <VendorRegistry />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sub-files"
            element={
              <ProtectedRoute allowedRoles={['TenderOfficer', 'FinancialAuditor']}>
                <MainLayout>
                  <SubFileDistribution />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <OfficialReports />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/archive"
            element={
              <ProtectedRoute allowedRoles={['Auditor']}>
                <MainLayout>
                  <Archive />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit-trail"
            element={
              <ProtectedRoute allowedRoles={['Auditor']}>
                <MainLayout>
                  <AuditTrail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <MainLayout>
                  <UserManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
