// src/app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, Users, Music as MusicIcon, RefreshCw } from 'lucide-react'
import { TriggerFetch } from '@/components/admin/trigger-fetch'
import { formatCount } from '@/lib/parse-douyin-data'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const { user, isAdmin, isLoading, setUser, setIsAdmin, setImpersonating } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingSongs, setLoadingSongs] = useState(true)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/dashboard')
    }
  }, [user, isAdmin, isLoading, router])

  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchUsers()
      fetchSongs()
    }
  }, [isAdmin, isLoading])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    setFetchError(null)
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setFetchError(err.error || `请求失败 (${response.status})`)
        return
      }
      const data = await response.json()
      setUsers(data.users)
    } catch (error) {
      console.error('Error fetching users:', error)
      setFetchError('网络错误，请刷新重试')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleImpersonate = async (targetUser: { id: string; email: string }) => {
    setImpersonatingId(targetUser.id)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('模拟登陆失败:', err.error)
        return
      }
      const { hashedToken, targetUser: userInfo } = await res.json()
      const supabase = createClient()
      await supabase.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
      await supabase.auth.refreshSession()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setIsAdmin(false)
        setImpersonating({ userId: userInfo.id, email: userInfo.email! })
      }
      router.push('/dashboard')
    } catch (error) {
      console.error('模拟登陆出错:', error)
    } finally {
      setImpersonatingId(null)
    }
  }

  const fetchSongs = async () => {
    setLoadingSongs(true)
    try {
      const response = await fetch('/api/admin/all-songs')
      if (response.ok) {
        const data = await response.json()
        setSongs(data.songs)
      }
    } catch (error) {
      console.error('Error fetching songs:', error)
    } finally {
      setLoadingSongs(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const rankColors = {
    A: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    B: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    C: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* 顶部导航 */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">管理后台</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                管理员: {users.filter(u => u.is_admin).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总歌曲数</CardTitle>
              <MusicIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{songs.length}</div>
              <p className="text-xs text-muted-foreground">
                Rank A: {songs.filter(s => s.rank === 'A').length} | 
                B: {songs.filter(s => s.rank === 'B').length} | 
                C: {songs.filter(s => s.rank === 'C').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均追踪</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.length > 0 
                  ? (users.reduce((sum, u) => sum + u.song_count, 0) / users.length).toFixed(1)
                  : 0
                }
              </div>
              <p className="text-xs text-muted-foreground">首歌曲/用户</p>
            </CardContent>
          </Card>
        </div>

        {/* 数据抓取控制 */}
        <div className="mb-8">
          <TriggerFetch />
        </div>

        {/* 数据表格 */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="songs">歌曲管理</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>
                  查看和管理所有注册用户
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : fetchError ? (
                  <div className="py-8 text-center text-red-500">{fetchError}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>邮箱</TableHead>
                        <TableHead>角色</TableHead>
                        <TableHead>追踪歌曲</TableHead>
                        <TableHead>注册时间</TableHead>
                        <TableHead>最后登录</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>
                            {u.is_admin ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {u.admin_role}
                              </Badge>
                            ) : (
                              <Badge variant="outline">普通用户</Badge>
                            )}
                          </TableCell>
                          <TableCell>{u.song_count} 首</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.last_sign_in_at
                              ? new Date(u.last_sign_in_at).toLocaleDateString('zh-CN')
                              : '从未登录'
                            }
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={u.is_admin || impersonatingId === u.id}
                              onClick={() => handleImpersonate({ id: u.id, email: u.email })}
                            >
                              {impersonatingId === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                '模拟登陆'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="songs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>歌曲列表</CardTitle>
                <CardDescription>
                  查看和管理所有追踪的歌曲
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSongs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>歌曲</TableHead>
                        <TableHead>歌手</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>追踪用户</TableHead>
                        <TableHead>点赞数</TableHead>
                        <TableHead>最后更新</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {songs.map((song) => (
                        <TableRow key={song.id}>
                          <TableCell className="font-medium">{song.title}</TableCell>
                          <TableCell>{song.artist}</TableCell>
                          <TableCell>
                            <Badge className={rankColors[song.rank as keyof typeof rankColors]}>
                              {song.rank}
                            </Badge>
                          </TableCell>
                          <TableCell>{song.user_count} 人</TableCell>
                          <TableCell>
                            {song.latest_stats 
                              ? formatCount(song.latest_stats.likes)
                              : '--'
                            }
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {song.latest_stats?.fetched_at
                              ? new Date(song.latest_stats.fetched_at).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '无数据'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}