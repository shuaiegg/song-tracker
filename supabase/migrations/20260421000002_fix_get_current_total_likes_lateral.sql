-- 修复 get_current_total_likes 超时问题
-- 原因：全表 DISTINCT ON 扫描无日期过滤，song_stats 数据量大时超过 30s 超时，返回 null
-- 结果：weekly-trend 页面 runningTotal 从 0 开始，总点赞量蓝线全为 0
-- 修复：改用 LATERAL JOIN + LIMIT 1，利用 idx_song_stats_song_fetched (song_id, fetched_at DESC)
--       每首歌只做一次 B-tree 点查，不再全表扫描

CREATE OR REPLACE FUNCTION public.get_current_total_likes()
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT COALESCE(SUM(latest.likes), 0)
  FROM user_song_relations usr
  INNER JOIN LATERAL (
    SELECT likes
    FROM song_stats ss
    WHERE ss.song_id = usr.song_id
    ORDER BY ss.fetched_at DESC
    LIMIT 1
  ) latest ON true
  WHERE usr.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_total_likes() TO authenticated;
