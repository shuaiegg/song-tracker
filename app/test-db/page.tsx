// src/app/test-db/page.tsx
import { createClient } from '@supabase/supabase-js'

export default async function TestPage() {
  // 使用 service_role key 绕过 RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 使用 service_role
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  // 测试数据库连接
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .limit(5)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase 连接测试</h1>
      
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">连接失败</p>
          <p>{error.message}</p>
        </div>
      ) : (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">✅ 连接成功！</p>
          <p>数据库正常工作</p>
          <p className="mt-2">找到 {data?.length || 0} 条歌曲记录</p>
          {data && data.length > 0 && (
            <pre className="mt-2 text-sm bg-white p-2 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-800">
          💡 提示：此测试使用 service_role key 绕过 RLS 策略
        </p>
      </div>
    </div>
  )
}