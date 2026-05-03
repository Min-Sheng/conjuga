import { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api, setToken, clearToken, isAuthenticated } from './api/client'

// Pages
import AuthPage from './pages/AuthPage'
import SearchPage from './pages/SearchPage'
import VerbPage from './pages/VerbPage'
import VocabPage from './pages/VocabPage'
import QuizPage from './pages/QuizPage'
import NavBar from './components/NavBar'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60_000 } },
})

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle OAuth callback: /auth/callback#token=...
    if (window.location.pathname === '/auth/callback') {
      const hash = window.location.hash
      const match = hash.match(/token=([^&]+)/)
      if (match) {
        setToken(decodeURIComponent(match[1]))
        window.history.replaceState({}, '', '/')
      }
    }

    if (isAuthenticated()) {
      api.me()
        .then((u) => setUser(u))
        .catch(() => clearToken())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    setToken(data.access_token)
    const me = await api.me()
    setUser(me)
    return me
  }

  const register = async (email, password, display_name) => {
    const data = await api.register({ email, password, display_name })
    setToken(data.access_token)
    const me = await api.me()
    setUser(me)
    return me
  }

  const logout = () => {
    clearToken()
    setUser(null)
    queryClient.clear()
  }

  const updateProfile = async (data) => {
    const updated = await api.updateProfile(data)
    setUser(prev => ({ ...prev, ...updated }))
    return updated
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen">載入中…</div>
  if (!user) return <Navigate to="/auth" replace />
  return (
    <>
      {children}
      <NavBar />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
            <Route path="/verb/:infinitive" element={<ProtectedRoute><VerbPage /></ProtectedRoute>} />
            <Route path="/vocab" element={<ProtectedRoute><VocabPage /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
