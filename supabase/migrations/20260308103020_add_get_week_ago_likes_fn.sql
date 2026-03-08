-- 添加 get_week_ago_likes() 函数
-- 用于获取每首歌最接近 7 天前的 likes 数据，供周变化计算使用
-- 使用 DISTINCT ON 在数据库端聚合，避免返回海量原始行（支持 2 万首以上规模）

CREATE OR REPLACE FUNCTION public.get_week_ago_likes()
RETURNS TABLE(song_id uuid, likes bigint)
LANGUAGE sql
SECURITY INVOKER  -- 使用调用者身份，RLS 正常生效
STABLE
AS $$
  SELECT DISTINCT ON (ss.song_id)
    ss.song_id,
    ss.likes
  FROM song_stats ss
  JOIN user_song_relations usr ON usr.song_id = ss.song_id
  WHERE usr.user_id = auth.uid()
    AND ss.fetched_at BETWEEN NOW() - INTERVAL '17 days' AND NOW() - INTERVAL '3 days'
  ORDER BY
    ss.song_id,
    ABS(EXTRACT(EPOCH FROM (ss.fetched_at - (NOW() - INTERVAL '7 days'))))
$$;

GRANT EXECUTE ON FUNCTION public.get_week_ago_likes() TO authenticated;
