-- 修复 get_week_ago_likes 两个问题：
-- 1. 原窗口 3~17天 有盲区：3天内新增的歌曲无基准值，其全部点赞被误算为"本周增量"
-- 2. DISTINCT ON 全范围扫描，数据量大时性能差
-- 修复：改用 LATERAL JOIN + LIMIT 1，找每首歌最近一条"至少7天前"的记录作为基准
--       无7天历史的歌曲自动排除在周对比之外，不会虚增增量

CREATE OR REPLACE FUNCTION public.get_week_ago_likes()
RETURNS TABLE(song_id uuid, likes bigint)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET statement_timeout = '30s'
AS $$
  SELECT usr.song_id, prev.likes
  FROM user_song_relations usr
  INNER JOIN LATERAL (
    SELECT ss.likes
    FROM song_stats ss
    WHERE ss.song_id = usr.song_id
      AND ss.fetched_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
    ORDER BY ss.fetched_at DESC
    LIMIT 1
  ) prev ON true
  WHERE usr.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_week_ago_likes() TO authenticated;
