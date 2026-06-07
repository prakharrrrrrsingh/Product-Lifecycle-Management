import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { loginUser, registerUser, registerAdmin } from '../api/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Zap, Sun, Moon, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

type Mode = 'login' | 'register' | 'register-admin'

export default function LoginPage() {
  const { login }          = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate           = useNavigate()

  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPwd]      = useState('')
  const [fullName, setName]     = useState('')
  const [adminCode, setCode]    = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [apiError, setApiErr]   = useState('')
  const [emailError, setEmailErr]   = useState('')
  const [pwdError, setPwdErr]       = useState('')

  function validateEmail(val: string) {
    if (!val) return 'Email is required.'
    if (!val.includes('@') || !val.toLowerCase().includes('.com'))
      return 'Enter a valid email id (must contain @ and .com).'
    return ''
  }

  function validatePassword(val: string) {
    if (!val) return 'Password is required.'
    if (val.length < 6) return 'Your password is too weak — minimum 6 characters.'
    if (mode !== 'login') {
      if (!/[A-Z]/.test(val)) return 'Your password is weak — add at least one uppercase letter.'
      if (!/[0-9]/.test(val)) return 'Your password is weak — add at least one number.'
    }
    return ''
  }

  const loginMutation = useMutation({
    mutationFn: () => loginUser({ email, password }),
    onSuccess: (data) => {
      login({ token: data.token, email: data.email, fullName: data.fullName, role: data.role, expiresAt: data.expiresAt })
      navigate('/')
    },
    onError: (e: Error) => setApiErr(e.message),
  })

  const registerMutation = useMutation({
    mutationFn: () =>
      mode === 'register-admin'
        ? registerAdmin({ email, password, fullName: fullName || undefined, adminCode })
        : registerUser({ email, password, fullName: fullName || undefined }),
    onSuccess: () => {
      setMode('login')
      setApiErr('')
      setName('')
      setCode('')
    },
    onError: (e: Error) => setApiErr(e.message),
  })

  const isPending = loginMutation.isPending || registerMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setApiErr('')
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    setEmailErr(eErr)
    setPwdErr(pErr)
    if (eErr || pErr) return
    if (mode === 'login') loginMutation.mutate()
    else registerMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0c14] flex items-center justify-center p-4">
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 btn-icon w-9 h-9"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand mb-4">
            <Zap size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">DeviceCycle</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Product Lifecycle Management</p>
        </div>

        <div className="card p-6">
          <div className="flex bg-gray-100 dark:bg-gray-800/60 rounded-lg p-1 mb-6 gap-1">
            {(['login', 'register', 'register-admin'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setApiErr(''); setEmailErr(''); setPwdErr('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  mode === m
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {m === 'register-admin' && <ShieldCheck size={11} />}
                {m === 'login' ? 'Sign In' : m === 'register' ? 'Register' : 'Admin'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== 'login' && (
              <div className="space-y-1.5">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="form-label">Email</label>
              <input
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                placeholder="you@example.com"
                autoComplete="email"
                className={`input ${emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              />
              {emailError && (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPwd(e.target.value); setPwdErr('') }}
                  placeholder={mode === 'login' ? '••••••••' : 'Min. 6 characters'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={`input pr-10 ${pwdError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwdError && (
                <p className="flex items-center gap-1.5 text-xs text-amber-500">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  {pwdError}
                </p>
              )}
            </div>

            {mode === 'register-admin' && (
              <div className="space-y-1.5">
                <label className="form-label flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-brand-500" />
                  Admin Registration Code
                </label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Enter secret admin code"
                  className="input"
                />
              </div>
            )}

            {apiError && (() => {
              const isNotRegistered = apiError.toLowerCase().includes('not registered')
              const isPasswordWeak  = /password|digit|uppercase|lowercase|character|length/i.test(apiError)
              return (
                <div className={`flex items-start gap-2 p-3 rounded-lg border ${
                  isPasswordWeak
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50'
                }`}>
                  <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${isPasswordWeak ? 'text-amber-500' : 'text-red-500'}`} />
                  <div className="flex-1">
                    <p className={`text-xs ${isPasswordWeak ? 'text-amber-700 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPasswordWeak ? '🔒 Password is not strong enough: ' : ''}{apiError}
                    </p>
                    {isNotRegistered && (
                      <button
                        type="button"
                        onClick={() => { setMode('register'); setApiErr(''); setEmailErr(''); setPwdErr('') }}
                        className="mt-1.5 text-xs font-semibold text-brand-500 hover:text-brand-600 underline underline-offset-2"
                      >
                        Click here to register →
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Register as Admin'
              }
            </button>
          </form>
        </div>

        {registerMutation.isSuccess && (
          <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 mt-4 animate-fade-in">
            Account created! You can now sign in.
          </p>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          DeviceCycle PLM · ASP.NET Core + React
        </p>
      </div>
    </div>
  )
}
