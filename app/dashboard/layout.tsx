// src/app/dashboard/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { logout } from '../(auth)/actions'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, ListMusic, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isAdmin, isLoading, isInitialized } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname() //get current path

  // 基础权限校验
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const handleLogout = async () => {
    await logout()
  }

  //define navigator
  const navItems = [
    {
      name: '控制台',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: '歌曲列表',
      href: '/dashboard/songs-list', // 假设你的歌曲列表页面路径是这个
      icon: ListMusic,
    },
  ]

  // ✨ 优化：只在首次初始化时显示 loading，后续刷新使用持久化的数据
  if (isLoading && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录：返回 null（会被 useEffect 重定向到登录页）
  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* 顶部导航栏 - 现在在 Layout 中 */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* 左侧：Logo 和 导航链接 */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold hidden md:block">数据追踪</h1>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === item.href 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* 右侧：用户信息和退出 */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium leading-none">{user.email?.split('@')[0]}</span>
              {isAdmin && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                  管理员
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              退出
            </Button>
          </div>
        </div>
      </header>
      {/* <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
            <Music className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">歌曲数据追踪系统</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {user.email}
              {isAdmin && (
                <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                  管理员
                </span>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </header> */}

      {/* 页面内容注入点 */}
      {children}
    </div>
  )
}