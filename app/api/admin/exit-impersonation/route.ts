import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()

    const adminRefreshToken = cookieStore.get('imp_admin_rt')?.value
    if (!adminRefreshToken) {
      return NextResponse.json({ error: '未处于模拟登陆状态' }, { status: 400 })
    }

    // Clear impersonation cookies
    cookieStore.set('imp_admin_rt', '', { maxAge: 0, path: '/' })
    cookieStore.set('is_impersonating', '', { maxAge: 0, path: '/' })

    return NextResponse.json({ adminRefreshToken })
  } catch (error: any) {
    console.error('Exit impersonation error:', error)
    return NextResponse.json({ error: error.message || '操作失败' }, { status: 500 })
  }
}
