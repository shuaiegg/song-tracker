-- ============================================
-- 阶段 11.2：新增歌曲扩展字段
-- ============================================

-- 1. 新增字段到 songs 表
ALTER TABLE songs
  -- 多值字段（可以有多个人）
  ADD COLUMN IF NOT EXISTS singers TEXT[],           -- 歌手（数组）
  ADD COLUMN IF NOT EXISTS lyricists TEXT[],         -- 作词（数组）
  ADD COLUMN IF NOT EXISTS composers TEXT[],         -- 作曲（数组）
  ADD COLUMN IF NOT EXISTS producers TEXT[],         -- 制作人（数组）
  ADD COLUMN IF NOT EXISTS arrangers TEXT[],         -- 编曲（数组）
  ADD COLUMN IF NOT EXISTS mixing_engineers TEXT[],  -- 混音（数组）
  ADD COLUMN IF NOT EXISTS recording_engineers TEXT[], -- 录音（数组）
  
  -- 单值字段
  ADD COLUMN IF NOT EXISTS album_id TEXT,            -- 专辑ID
  
  -- 多选字段
  ADD COLUMN IF NOT EXISTS genres TEXT[];            -- 音乐风格（数组）

-- 2. 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_songs_singers ON songs USING GIN (singers);
CREATE INDEX IF NOT EXISTS idx_songs_genres ON songs USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON songs (album_id);

-- 3. 添加注释（方便理解）
COMMENT ON COLUMN songs.singers IS '歌手列表';
COMMENT ON COLUMN songs.lyricists IS '作词人列表';
COMMENT ON COLUMN songs.composers IS '作曲人列表';
COMMENT ON COLUMN songs.producers IS '制作人列表';
COMMENT ON COLUMN songs.arrangers IS '编曲人列表';
COMMENT ON COLUMN songs.mixing_engineers IS '混音师列表';
COMMENT ON COLUMN songs.recording_engineers IS '录音师列表';
COMMENT ON COLUMN songs.album_id IS '专辑ID';
COMMENT ON COLUMN songs.genres IS '音乐风格标签';

-- 4. 验证结果
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'songs' 
  AND column_name IN (
    'singers', 'lyricists', 'composers', 'producers', 
    'arrangers', 'mixing_engineers', 'recording_engineers', 
    'album_id', 'genres'
  );