-- 修复 process_daily_song_stats 超时问题
-- 原因：DISTINCT ON + 全日期范围扫描会把当天所有行加载到内存排序，数据量大时超过 120s
-- 修复：改用 LATERAL JOIN + LIMIT 1，直接利用 idx_song_stats_song_fetched (song_id, fetched_at DESC)
--       每首歌只做一次 B-tree 点查，时间复杂度从 O(N log N) 降到 O(songs × log N)
-- 额外：ON CONFLICT DO UPDATE（替代 DO NOTHING）允许重跑时修正历史错误值（如 3月30日 0增量）

CREATE OR REPLACE FUNCTION public.process_daily_song_stats(target_date date)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  yesterday DATE := target_date - 1;
  processed_count INT;
BEGIN
  SET LOCAL statement_timeout = '120s';

  WITH
  -- 当天：每首歌最新一条，直接走 (song_id, fetched_at DESC) 索引
  stats_today AS (
    SELECT s.id AS song_id, t.likes, t.favorites, t.comments, t.shares
    FROM songs s
    INNER JOIN LATERAL (
      SELECT likes, favorites, comments, shares
      FROM song_stats ss
      WHERE ss.song_id = s.id
        AND ss.fetched_at >= target_date::timestamptz
        AND ss.fetched_at <  (target_date + 1)::timestamptz
      ORDER BY ss.fetched_at DESC
      LIMIT 1
    ) t ON true
  ),
  -- 前一天：每首歌最新一条，同上
  stats_yesterday AS (
    SELECT s.id AS song_id, y.likes, y.favorites, y.comments, y.shares
    FROM songs s
    INNER JOIN LATERAL (
      SELECT likes, favorites, comments, shares
      FROM song_stats ss
      WHERE ss.song_id = s.id
        AND ss.fetched_at >= yesterday::timestamptz
        AND ss.fetched_at <  target_date::timestamptz
      ORDER BY ss.fetched_at DESC
      LIMIT 1
    ) y ON true
  ),
  calculations AS (
    SELECT
      t.song_id,
      t.likes     - COALESCE(y.likes,     0) AS likes_diff,
      t.favorites - COALESCE(y.favorites, 0) AS favorites_diff,
      t.comments  - COALESCE(y.comments,  0) AS comments_diff,
      t.shares    - COALESCE(y.shares,    0) AS shares_diff,
      CASE
        WHEN COALESCE(y.likes, 0) > 0
          THEN ((t.likes - y.likes)::float / y.likes) * 100
        ELSE 0
      END AS change_rate
    FROM stats_today t
    LEFT JOIN stats_yesterday y ON t.song_id = y.song_id
  ),
  inserted AS (
    INSERT INTO daily_stats (song_id, date, likes, favorites, comments, shares, change_rate)
    SELECT song_id, target_date, likes_diff, favorites_diff, comments_diff, shares_diff, change_rate
    FROM calculations
    ON CONFLICT (song_id, date) DO UPDATE SET
      likes       = EXCLUDED.likes,
      favorites   = EXCLUDED.favorites,
      comments    = EXCLUDED.comments,
      shares      = EXCLUDED.shares,
      change_rate = EXCLUDED.change_rate
    RETURNING id
  )
  SELECT count(*) INTO processed_count FROM inserted;

  RETURN json_build_object(
    'status', 'success',
    'date', target_date,
    'processed_rows', processed_count
  );
END;
$$;
