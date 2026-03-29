-- 修复 get_current_total_likes 函数超时问题
-- 添加函数级 SET statement_timeout，允许运行最多 30 秒

CREATE OR REPLACE FUNCTION public.get_current_total_likes()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT COALESCE(SUM(latest.likes), 0)
  FROM (
    SELECT DISTINCT ON (ss.song_id) ss.likes
    FROM song_stats ss
    JOIN user_song_relations usr ON usr.song_id = ss.song_id
    WHERE usr.user_id = auth.uid()
    ORDER BY ss.song_id, ss.fetched_at DESC
  ) latest;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_total_likes() TO authenticated;
