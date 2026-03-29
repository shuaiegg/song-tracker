-- 获取当前用户过去3个月每周的点赞增量
-- 基于 daily_stats 表按周分组聚合
-- SECURITY INVOKER：以调用者身份执行，RLS 正常生效

CREATE OR REPLACE FUNCTION public.get_weekly_likes_increments()
RETURNS TABLE(week_start date, weekly_new_likes bigint)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT
    DATE_TRUNC('week', date)::date AS week_start,
    SUM(likes) AS weekly_new_likes
  FROM daily_stats
  WHERE song_id IN (
    SELECT song_id FROM user_song_relations WHERE user_id = auth.uid()
  )
    AND date >= NOW() - INTERVAL '3 months'
  GROUP BY DATE_TRUNC('week', date)
  ORDER BY week_start ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_likes_increments() TO authenticated;
