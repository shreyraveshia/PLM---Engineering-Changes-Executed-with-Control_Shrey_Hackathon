import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/Dashboard';
import ProductsList from './pages/products/ProductsList';
import ProductDetail from './pages/products/ProductDetail';
import BomsList from './pages/boms/BomsList';
import BomDetail from './pages/boms/BomDetail';
import EcosList from './pages/ecos/EcosList';
import EcoDetail from './pages/ecos/EcoDetail';
import EcoDiff from './pages/ecos/EcoDiff';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import AuditLog from './pages/audit/AuditLog';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}/>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="products/new" element={<ProductDetail />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="boms" element={<BomsList />} />
            <Route path="boms/new" element={<BomDetail />} />
            <Route path="boms/:id" element={<BomDetail />} />
            <Route path="ecos" element={
              <ProtectedRoute roles={['admin','engineering_user','approver']}>
                <EcosList />
              </ProtectedRoute>
            }/>
            <Route path="ecos/new" element={
              <ProtectedRoute roles={['admin','engineering_user']}>
                <EcoDetail />
              </ProtectedRoute>
            }/>
            <Route path="ecos/:id" element={
              <ProtectedRoute roles={['admin','engineering_user','approver']}>
                <EcoDetail />
              </ProtectedRoute>
            }/>
            <Route path="ecos/:id/diff" element={
              <ProtectedRoute roles={['admin','engineering_user','approver']}>
                <EcoDiff />
              </ProtectedRoute>
            }/>
            <Route path="reports" element={
              <ProtectedRoute roles={['admin','engineering_user','approver']}>
                <Reports />
              </ProtectedRoute>
            }/>
            <Route path="settings" element={
              <ProtectedRoute roles={['admin']}>
                <Settings />
              </ProtectedRoute>
            }/>
            <Route path="audit" element={
              <ProtectedRoute roles={['admin']}>
                <AuditLog />
              </ProtectedRoute>
            }/>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}