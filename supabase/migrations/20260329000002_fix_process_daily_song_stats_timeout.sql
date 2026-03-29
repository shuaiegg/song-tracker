-- 修复 process_daily_song_stats 函数超时问题
-- 添加 SET LOCAL statement_timeout = '120s'，允许函数最多运行 2 分钟
-- 其余逻辑与原函数完全一致

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
    SELECT DISTINCT ON (song_id) song_id, likes, favorites, comments, shares
    FROM song_stats
    WHERE fetched_at >= target_date::timestamp
      AND fetched_at < (target_date + 1)::timestamp
    ORDER BY song_id, fetched_at DESC
  ),
  stats_yesterday AS (
    SELECT DISTINCT ON (song_id) song_id, likes, favorites, comments, shares
    FROM song_stats
    WHERE fetched_at >= yesterday::timestamp
      AND fetched_at < target_date::timestamp
    ORDER BY song_id, fetched_at DESC
  ),
  calculations AS (
    SELECT
      t.song_id,
      t.likes - COALESCE(y.likes, 0) as likes_diff,
      t.favorites - COALESCE(y.favorites, 0) as favorites_diff,
      t.comments - COALESCE(y.comments, 0) as comments_diff,
      t.shares - COALESCE(y.shares, 0) as shares_diff,
      CASE
        WHEN COALESCE(y.likes, 0) > 0 THEN ((t.likes - y.likes)::float / y.likes) * 100
        ELSE 0
      END as change_rate
    FROM stats_today t
    LEFT JOIN stats_yesterday y ON t.song_id = y.song_id
  ),
  inserted AS (
    INSERT INTO daily_stats (song_id, date, likes, favorites, comments, shares, change_rate)
    SELECT song_id, target_date, likes_diff, favorites_diff, comments_diff, shares_diff, change_rate
    FROM calculations
    ON CONFLICT (song_id, date) DO NOTHING
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
