import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bike } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/')
  }

  return (
    <div className="min-h-full bg-navy flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div className="absolute top-20 -left-10 w-64 h-64 rounded-full border-[3px] border-white" />
        <div className="absolute bottom-32 -right-16 w-80 h-80 rounded-full border-[3px] border-white" />
      </div>

      <div className="text-center mb-10 relative">
        <div className="w-16 h-16 bg-accent/20 border border-accent/30 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-6">
          <Bike size={32} className="text-accent -rotate-6" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">
          青切符ドライブ
        </h1>
        <p className="text-white/50 text-sm mt-2 font-grotesk tracking-wide">
          SAFE CYCLING COMPANION
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3 relative">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-white/[0.07] text-white placeholder-white/30 border border-white/10 focus:border-accent/50 focus:outline-none text-base transition"
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3.5 rounded-xl bg-white/[0.07] text-white placeholder-white/30 border border-white/10 focus:border-accent/50 focus:outline-none text-base transition"
        />
        <button
          type="submit"
          className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl transition text-base font-grotesk tracking-wide mt-2"
        >
          ログイン
        </button>
        <p className="text-center text-white/40 text-sm pt-2">
          アカウントをお持ちでない方は{' '}
          <button type="button" className="text-accent underline underline-offset-2" onClick={() => navigate('/')}>
            新規登録
          </button>
        </p>
      </form>
    </div>
  )
}
