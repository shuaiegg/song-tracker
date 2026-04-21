-- 修复 process_daily_song_stats 第一天增量虚高问题
-- 原因：新歌第一天没有"昨日数据"，COALESCE(null, 0) 导致今日全量点赞被当成增量
-- 修复：昨日无数据时增量记为 0，从第二天起才计算真实日增量

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
      -- 昨日无数据（新歌第一天）时增量记 0，避免将历史累计量误算为增量
      CASE WHEN y.song_id IS NOT NULL THEN t.likes     - y.likes     ELSE 0 END AS likes_diff,
      CASE WHEN y.song_id IS NOT NULL THEN t.favorites - y.favorites ELSE 0 END AS favorites_diff,
      CASE WHEN y.song_id IS NOT NULL THEN t.comments  - y.comments  ELSE 0 END AS comments_diff,
      CASE WHEN y.song_id IS NOT NULL THEN t.shares    - y.shares    ELSE 0 END AS shares_diff,
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
