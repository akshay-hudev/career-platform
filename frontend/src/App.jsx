import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import JobSearch from './pages/JobSearch'
import ResumeAnalysis from './pages/ResumeAnalysis'
import SavedJobs from './pages/SavedJobs'
import MockInterview from './pages/MockInterview'

function ProtectedRoute({ children }) {
  const { user } = useUser()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useUser()
  return (
    <div className="min-h-screen bg-gray-950">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><JobSearch /></ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedJobs /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </UserProvider>
  )
}
