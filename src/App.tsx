import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import AuthGuard from './components/AuthGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VideoDetails from './pages/VideoDetails';
import Certificate from './pages/Certificate';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminModuleDetails from './pages/AdminModuleDetails';
import AdminGuard from './components/AdminGuard';
import { Toaster } from '@/components/ui/sonner';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<AuthGuard />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/modules/:moduleId" element={<VideoDetails />} />
              <Route path="/certificate" element={<Certificate />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin Routes */}
              <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/modules/:moduleId" element={<AdminModuleDetails />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  );
}
