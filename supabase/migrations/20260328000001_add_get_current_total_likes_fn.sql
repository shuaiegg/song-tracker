-- 高效获取当前用户所有歌曲的最新总点赞数
-- 使用 DISTINCT ON 每首歌只取最新一条，避免全表扫描
-- SECURITY INVOKER：以调用者身份执行，RLS 正常生效

CREATE OR REPLACE FUNCTION public.get_current_total_likes()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
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
