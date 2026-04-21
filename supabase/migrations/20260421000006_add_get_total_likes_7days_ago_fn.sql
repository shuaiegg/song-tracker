-- 新增 get_total_likes_7days_ago 函数
-- 与 get_current_total_likes 逻辑完全对称，只是取 7 天前的快照
-- 每首歌取 fetched_at <= NOW() - 7 days 中最新的一条记录
-- 新歌（追踪不足7天）在7天前没有记录，贡献为 0，其全部点赞自然计入增量

CREATE OR REPLACE FUNCTION public.get_total_likes_7days_ago()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT COALESCE(SUM(latest.likes), 0)
  FROM user_song_relations usr
  INNER JOIN LATERAL (
    SELECT ss.likes
    FROM song_stats ss
    WHERE ss.song_id = usr.song_id
      AND ss.fetched_at <= NOW() - INTERVAL '7 days'
    ORDER BY ss.fetched_at DESC
    LIMIT 1
  ) latest ON true
  WHERE usr.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_total_likes_7days_ago() TO authenticated;
