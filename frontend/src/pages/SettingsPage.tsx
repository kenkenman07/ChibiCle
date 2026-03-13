import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Bell, LogOut, Check } from 'lucide-react'

export function SettingsPage() {
  const navigate = useNavigate()
  const [parentEmail, setParentEmail] = useState('parent@example.com')
  const [notifications, setNotifications] = useState(true)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-5 pt-8 pb-4 max-w-lg mx-auto">
      <p className="text-sm text-navy/40 font-grotesk tracking-wide">SETTINGS</p>
      <h1 className="text-2xl font-serif font-bold text-navy mt-1 mb-6">設定</h1>

      {/* プロフィール */}
      <div className="bg-white border border-navy/[0.06] rounded-xl p-4 mb-3 flex items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
          <User size={20} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-navy text-sm">テストユーザー</p>
          <p className="text-xs text-navy/40 font-grotesk">test@example.com</p>
        </div>
      </div>

      {/* 保護者メール */}
      <div className="bg-white border border-navy/[0.06] rounded-xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={14} className="text-navy/40" />
          <h2 className="text-sm font-semibold text-navy">保護者メールアドレス</h2>
        </div>
        <p className="text-xs text-navy/35 mb-3">走行結果を保護者にメールで通知します</p>
        <input
          type="email"
          value={parentEmail}
          onChange={(e) => setParentEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-navy/10 text-sm focus:border-primary focus:outline-none text-base"
        />
      </div>

      {/* 通知 */}
      <div className="bg-white border border-navy/[0.06] rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-navy/40" />
          <span className="text-sm font-semibold text-navy">通知</span>
        </div>
        <button
          onClick={() => setNotifications(!notifications)}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            notifications ? 'bg-primary' : 'bg-navy/15'
          }`}
        >
          <div
            className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm absolute top-[3px] transition-all ${
              notifications ? 'left-[22px]' : 'left-[3px]'
            }`}
            style={{ width: 18, height: 18 }}
          />
        </button>
      </div>

      {/* 保存 */}
      <button
        onClick={handleSave}
        className={`w-full font-bold py-3 rounded-xl transition text-base font-grotesk tracking-wide ${
          saved
            ? 'bg-success text-white'
            : 'bg-navy text-white active:bg-navy-light'
        }`}
      >
        {saved ? (
          <span className="flex items-center justify-center gap-1.5">
            <Check size={16} />
            保存しました
          </span>
        ) : (
          '保存する'
        )}
      </button>

      {/* ログアウト */}
      <button
        onClick={() => navigate('/login')}
        className="w-full flex items-center justify-center gap-2 text-navy/30 text-sm py-4 mt-2"
      >
        <LogOut size={14} />
        ログアウト
      </button>
    </div>
  )
}
