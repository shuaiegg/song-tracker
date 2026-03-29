-- 修复 get_weekly_likes_increments 函数超时问题
-- 1. 通过函数级 SET statement_timeout 允许运行最多 60 秒
-- 2. 将 IN 子查询改为 JOIN，查询计划更高效

CREATE OR REPLACE FUNCTION public.get_weekly_likes_increments()
RETURNS TABLE(week_start date, weekly_new_likes bigint)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '60s'
AS $$
  SELECT
    DATE_TRUNC('week', ds.date)::date AS week_start,
    SUM(ds.likes) AS weekly_new_likes
  FROM daily_stats ds
  JOIN user_song_relations usr ON usr.song_id = ds.song_id AND usr.user_id = auth.uid()
  WHERE ds.date >= NOW() - INTERVAL '3 months'
  GROUP BY DATE_TRUNC('week', ds.date)
  ORDER BY week_start ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_likes_increments() TO authenticated;
