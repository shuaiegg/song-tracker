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

export interface DouyinApiResponse {
  track_id: string;
  title: string;
  author: string;
  album?: string;
  cover?: string;
  stats: {
    digg_count: number; // 点赞
    collect_count: number; // 收藏
    comment_count: number; // 评论
    share_count: number; // 分享
  };
}