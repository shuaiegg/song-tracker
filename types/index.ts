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