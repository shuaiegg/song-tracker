import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 核心：决定统计哪一天。
    // 如果你在北京时间凌晨 04:00 (UTC 20:00) 运行，你可能想统计的是【昨天】(因为今天还没过完)
    // 或者是【UTC的今天】(即截止到运行时的快照)。
    
    // 假设策略：统计【昨天】的完整数据 (UTC时间)
    // 这样确保这一天的数据已经全部入库，不再变动。
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - 1); // 减去一天
    const targetDate = dateObj.toISOString().split('T')[0];

    console.log(`Starting daily rollup via RPC for date: ${targetDate}...`);

    // 调用数据库函数
    const { data, error } = await supabaseClient.rpc('process_daily_song_stats', {
      target_date: targetDate
    });

    if (error) throw error;

    console.log('RPC Result:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});