-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 创建一个函数来调用 Edge Function
CREATE OR REPLACE FUNCTION trigger_fetch_rank_a()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key text;
BEGIN
  -- 这里需要使用 HTTP 扩展调用 Edge Function
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-rank-a',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
END;
$$;

-- Rank A: 每小时执行
SELECT cron.schedule(
  'fetch-rank-a-hourly',
  '0 * * * *',  -- 每小时的第0分钟
  $$SELECT trigger_fetch_rank_a()$$
);

-- Rank B: 每6小时执行
SELECT cron.schedule(
  'fetch-rank-b-6hourly',
  '0 */6 * * *',  -- 每6小时的第0分钟
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-rank-b',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  )$$
);

-- Rank C: 每12小时执行
SELECT cron.schedule(
  'fetch-rank-c-12hourly',
  '0 */12 * * *',  -- 每12小时的第0分钟
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/fetch-rank-c',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  )$$
);

-- 查看所有定时任务
SELECT * FROM cron.job;