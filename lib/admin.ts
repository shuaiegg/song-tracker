// src/lib/admin.ts
import { createClient } from '@/lib/supabase/server'

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('admins')
      .select('role')
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}