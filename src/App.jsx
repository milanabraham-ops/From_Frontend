import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RequireRole from './components/auth/RequireRole'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import Dashboard from './components/dashboard/Dashboard'
import SpecialistQueue from './components/dashboard/SpecialistQueue'
import QAQueue from './components/dashboard/QAQueue'
import AdminUsers from './components/dashboard/AdminUsers'
import FormWizard from './components/form/FormWizard'
import NewSubmissionEntry from './components/form/NewSubmissionEntry'
import GroupDetail from './components/form/GroupDetail'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <RequireRole roles={['poc', 'admin']}>
                  <Dashboard />
                </RequireRole>
              }
            />
            <Route
              path="/new"
              element={
                <RequireRole roles={['poc', 'admin']}>
                  <NewSubmissionEntry />
                </RequireRole>
              }
            />
            <Route
              path="/groups/:id"
              element={
                <RequireRole roles={['poc', 'admin']}>
                  <GroupDetail />
                </RequireRole>
              }
            />
            <Route
              path="/groups/:groupId/new"
              element={
                <RequireRole roles={['poc', 'admin']}>
                  <FormWizard mode="create" />
                </RequireRole>
              }
            />
            <Route
              path="/submissions/:id"
              element={
                <ProtectedRoute>
                  <FormWizard mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialist"
              element={
                <RequireRole roles={['specialist', 'admin']}>
                  <SpecialistQueue />
                </RequireRole>
              }
            />
            <Route
              path="/qa"
              element={
                <RequireRole roles={['qa', 'admin']}>
                  <QAQueue />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <AdminUsers />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
