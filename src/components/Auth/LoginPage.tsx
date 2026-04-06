// =====================================================
// 로그인 / 회원가입 페이지
// =====================================================

import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuthStore()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'login') {
      const err = await signInWithEmail(email, password)
      if (err) setError(err)
    } else {
      const err = await signUpWithEmail(email, password)
      if (err) {
        setError(err)
      } else {
        setMessage('가입 확인 이메일을 보냈어요! 이메일을 확인해주세요 📧')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            MyOutline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            아이디어를 구조화하는 가장 쉬운 방법
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">

          {/* 탭 */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setMessage('') }}
              className={`
                flex-1 py-1.5 text-sm font-medium rounded-md transition-all
                ${mode === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              로그인
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setMessage('') }}
              className={`
                flex-1 py-1.5 text-sm font-medium rounded-md transition-all
                ${mode === 'signup'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              회원가입
            </button>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="
                  w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-700
                  text-gray-900 dark:text-white
                  placeholder-gray-400
                  focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                  text-sm
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자리 이상"
                required
                minLength={6}
                className="
                  w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-700
                  text-gray-900 dark:text-white
                  placeholder-gray-400
                  focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                  text-sm
                "
              />
            </div>

            {/* 에러 메시지 */}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                ⚠️ {translateError(error)}
              </p>
            )}

            {/* 성공 메시지 */}
            {message && (
              <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                ✅ {message}
              </p>
            )}

            {/* 로그인/가입 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-2.5 rounded-lg font-medium text-sm
                bg-primary-500 hover:bg-primary-600 text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* 구글 로그인 */}
          <button
            onClick={signInWithGoogle}
            className="
              w-full py-2.5 rounded-lg font-medium text-sm
              border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-600
              transition-colors flex items-center justify-center gap-2
            "
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          로그인하면 모든 기기에서 데이터가 동기화돼요 ✨
        </p>
      </div>
    </div>
  )
}

// Supabase 에러 메시지를 한국어로 변환
function translateError(error: string): string {
  if (error.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 틀렸어요'
  if (error.includes('Email not confirmed')) return '이메일 인증을 먼저 완료해주세요'
  if (error.includes('User already registered')) return '이미 가입된 이메일이에요'
  if (error.includes('Password should be at least')) return '비밀번호는 6자리 이상이어야 해요'
  if (error.includes('Unable to validate email')) return '올바른 이메일 주소를 입력해주세요'
  return error
}
