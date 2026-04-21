-- 恢复新歌第一天增量为全量点赞数（撤销 migration 000005 的第一天=0 逻辑）
-- 原因：与 Dashboard 保持一致
--   Dashboard: increment = get_current_total_likes() - get_total_likes_7days_ago()
--   Analytics: 每周增量由 daily_stats 反推，新歌第一天应计入全量，否则蓝线失真
-- 结论：新歌第一天 likes_diff = 今天累计总量 - 0 = 全量（真实反映总量跳升）
--       change_rate 仍保持为 0（无昨日基准，无法计算增长率）

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
        WHEN y.song_id IS NOT NULL AND y.likes > 0
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
