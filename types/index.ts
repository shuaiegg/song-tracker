// src/types/index.ts
export type RankType = 'A' | 'B' | 'C';

export interface Song {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  rank: RankType;
  created_at: string;

    // ✨ 新增字段
  singers?: string[];           // 歌手（数组）
  lyricists?: string[];         // 作词（数组）
  composers?: string[];         // 作曲（数组）
  producers?: string[];         // 制作人（数组）
  arrangers?: string[];         // 编曲（数组）
  mixing_engineers?: string[];  // 混音（数组）
  recording_engineers?: string[]; // 录音（数组）
  album_id?: string;            // 专辑ID
  genres?: string[]; 
}

export interface SongStats {
  id: number;
  song_id: string;
  likes: number;
  favorites: number;
  comments: number;
  shares?: number;
  fetched_at: string;
}

export interface DailyStats {
  id: number;
  song_id: string;
  date: string;
  likes: number;
  favorites: number;
  comments: number;
  shares?: number;
  change_rate: number;
}

export interface UserSongRelation {
  id: string;
  user_id: string;
  song_id: string;
  created_at: string;
  supervisor?: string;  // ✨ 新增：负责人
}

// 抖音 API 响应类型
export interface DouyinTrackInfo {
  track_id: string;
  title: string;
  author: string;
  album?: string;
  cover?: string;
  duration?: number;
  play_url?: string;
}

export interface DouyinTrackStats {
  digg_count: number;      // 点赞数
  collect_count: number;   // 收藏数
  comment_count: number;   // 评论数
  share_count: number;     // 分享数
  play_count?: number;     // 播放数（如果有）
}

export interface DouyinApiResponse {
  status_code: number;
  status_msg?: string;
  track_info?: DouyinTrackInfo;
  stats?: DouyinTrackStats;
  // 实际 API 可能返回嵌套结构，需要根据真实响应调整
  music_info?: {
    title: string;
    author: string;
    mid: string;
    cover_hd?: {
      url_list: string[];
    };
    album?: string;
  };
  statistics?: {
    digg_count: number;
    collect_count: number;
    comment_count: number;
    share_count: number;
  };
}

// 我们的标准化歌曲信息
export interface ParsedSongInfo {
  song_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  likes: number;
  favorites: number;
  comments: number;
  shares: number;
}

// ✨ 新增：添加歌曲时的表单数据类型
export interface SongFormData {
  // 基本信息（从抖音API获取）
  song_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string;
  rank: RankType;
  
  // 统计数据
  likes: number;
  favorites: number;
  comments: number;
  shares: number;
  
  // ✨ 扩展信息（用户手动填写）
  singers?: string[];
  lyricists?: string[];
  composers?: string[];
  producers?: string[];
  arrangers?: string[];
  mixing_engineers?: string[];
  recording_engineers?: string[];
  album_id?: string;
  genres?: string[];
  supervisor?: string;  // 负责人
}

// ✨ 新增：用于自动完成的建议类型
export interface FieldSuggestion {
  field: keyof SongFormData;
  values: string[];
}