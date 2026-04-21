-- 新增 get_7day_likes_increment 函数
-- 替代原 get_week_ago_likes 的"快照差值"方案
-- 直接对 daily_stats 过去7个完整日的增量求和
-- 优点：
--   1. 新歌（追踪不足7天）的增量自然包含在内，不再有盲区
--   2. 逻辑简单，不依赖"7天前快照"
--   3. 直接走 daily_stats，不扫描 song_stats 大表

CREATE OR REPLACE FUNCTION public.get_7day_likes_increment()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT COALESCE(SUM(ds.likes), 0)
  FROM daily_stats ds
  JOIN user_song_relations usr
    ON usr.song_id = ds.song_id AND usr.user_id = auth.uid()
  WHERE ds.date >= CURRENT_DATE - INTERVAL '7 days'
    AND ds.date < CURRENT_DATE;
$$;

GRANT EXECUTE ON FUNCTION public.get_7day_likes_increment() TO authenticated;
