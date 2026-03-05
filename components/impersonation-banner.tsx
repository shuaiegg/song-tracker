'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ImpersonationBanner() {
  const { impersonating, setUser, setIsAdmin, setImpersonating } = useAuthStore()
  const router = useRouter()

  if (!impersonating) return null

  const handleExit = async () => {
    const res = await fetch('/api/admin/exit-impersonation', { method: 'POST' })
    if (!res.ok) {
      console.error('退出模拟登陆失败')
      return
    }
    const { adminRefreshToken } = await res.json()
    const supabase = createClient()
    await supabase.auth.refreshSession({ refresh_token: adminRefreshToken })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      setImpersonating(null)
      // Re-check admin status
      fetch('/api/auth/is-admin').then(r => r.json()).then(d => setIsAdmin(d.isAdmin ?? false))
    }
    router.push('/admin')
  }

  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex justify-between items-center text-sm font-medium z-50">
      <span>正在以 <strong>{impersonating.email}</strong> 身份查看数据</span>
      <Button size="sm" variant="outline" className="border-yellow-700 text-yellow-900 hover:bg-yellow-500" onClick={handleExit}>
        退出模拟登陆
      </Button>
    </div>
  )
}
