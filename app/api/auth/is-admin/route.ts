// src/app/api/auth/is-admin/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }
    
    // 检查是否是管理员
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (error) {
      console.error('Admin check error:', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
    
    const isAdmin = !!data
    
    return NextResponse.json({ 
      isAdmin, 
      role: data?.role || null 
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}