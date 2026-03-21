import { useEffect, useMemo, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes, Link } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Credit from "./pages/Credit"
import Delivery from "./pages/Delivery"
import Payments from "./pages/Payments"
import Dispatch from "./pages/Dispatch"
import IT from "./pages/IT"
import API_BASE from "./config/api"
import appLogo from "./assets/anagha-logo-transparent.png"

const AUTH_STORAGE_KEY = "anagha_ops_auth"
const APP_VERSION = "v1.4.0"

function getDefaultRoute(role) {
  if (role === "it") {
    return "/it"
  }
  if (role === "delivery") {
    return "/delivery"
  }
  return "/"
}

function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const submit = (event) => {
    event.preventDefault()
    onLogin(username, password)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src={appLogo} alt="Anagha Operation logo" className="h-12 w-12 object-contain" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Anagha Operations</p>
              <h1 className="text-2xl font-semibold text-slate-900">Login</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Sign in to open the correct workspace for your team.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              autoComplete="current-password"
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button type="submit" className="w-full rounded-lg bg-black px-4 py-2 text-white">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

function AppShell({ auth, onLogout }) {
  const navItems = useMemo(() => {
    if (auth.role === "it") {
      return [{ to: "/it", label: "IT" }]
    }
    if (auth.role === "delivery") {
      return [{ to: "/delivery", label: "Delivery" }]
    }
    return [
      { to: "/", label: "Dashboard" },
      { to: "/credit", label: "Credit" },
      { to: "/delivery", label: "Delivery" },
      { to: "/payments", label: "Payments" },
      { to: "/dispatch", label: "Dispatch" },
      { to: "/it", label: "IT" },
    ]
  }, [auth.role])

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex h-screen w-64 shrink-0 flex-col bg-black p-5 text-white">
        <div className="z-10 mb-2 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 shadow-[0_20px_40px_-30px_rgba(255,255,255,0.35)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm">
              <img src={appLogo} alt="Anagha Operation logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 pr-2">
              <h1 className="text-[1.02rem] font-bold tracking-[0.08em] text-white">ANAGHA OPERATIONS</h1>
              <p className="mt-1 text-sm text-slate-300">{auth.label}</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {navItems.map((item) => (
            <Link key={item.to} className="hover:bg-gray-800 p-2 rounded" to={item.to}>
              {item.label}
            </Link>
          ))}

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={onLogout}
              className="w-full rounded border border-slate-700 px-4 py-2 text-left text-sm hover:bg-slate-900"
            >
              Logout
            </button>

            <p className="mt-3 text-xs text-slate-500">{APP_VERSION}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
        <Routes>
          {auth.role === "admin" ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/credit" element={<Credit />} />
              <Route path="/delivery" element={<Delivery />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/dispatch" element={<Dispatch />} />
              <Route path="/it" element={<IT />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : null}

          {auth.role === "it" ? (
            <>
              <Route path="/it" element={<IT />} />
              <Route path="*" element={<Navigate to="/it" replace />} />
            </>
          ) : null}

          {auth.role === "delivery" ? (
            <>
              <Route path="/delivery" element={<Delivery />} />
              <Route path="*" element={<Navigate to="/delivery" replace />} />
            </>
          ) : null}
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState(null)
  const [loginError, setLoginError] = useState("")

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) {
      return
    }

    try {
      const parsed = JSON.parse(stored)
      if (parsed?.role) {
        setAuth(parsed)
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(
        `${API_BASE}/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      )

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null)
        setLoginError(errorPayload?.detail || "Invalid username or password")
        return
      }

      const nextAuth = await response.json()
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth))
      setAuth(nextAuth)
      setLoginError("")
      window.location.hash = ""
      window.history.replaceState(null, "", getDefaultRoute(nextAuth.role))
    } catch {
      setLoginError("Unable to reach login service")
    }
  }

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    setAuth(null)
    setLoginError("")
  }

  return (
    <BrowserRouter>
      {auth ? <AppShell auth={auth} onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} error={loginError} />}
    </BrowserRouter>
  )
}
