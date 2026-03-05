// src/lib/parse-douyin-data.ts
import { DouyinApiResponse, ParsedSongInfo } from '@/types'

/**
 * 解析抖音 API 响应数据
 * 基于实际的 API 响应结构
 */
export function parseDouyinResponse(data: any, trackId: string): ParsedSongInfo | null {
  try {
    // 实际数据在 seo_track 中
    const seoTrack = data.seo_track
    
    if (!seoTrack) {
      console.error('No seo_track found in response')
      return null
    }

    // 提取歌曲信息
    const title = seoTrack.track.name || '未知歌曲'
    const artist = seoTrack.track?.artists?.[0]?.name || '未知歌手'
    const album_id = seoTrack.track?.album.id || ''
    const album = seoTrack.track?.album?.name || '未知专辑'
    const coverUrl = seoTrack.cover || seoTrack.cover_url || ''
    
    // 提取统计数据
    const stats = seoTrack.track?.stats || {}
    const likes = parseInt(stats.count_collected || '0')
    const comments = parseInt(stats.count_comment || '0')
    const shares = parseInt(stats.count_shared || '0')
    
    // favorites 目前没有对应字段，可以设为 0 或使用其他字段
    const favorites = parseInt(stats.count_favorite || '0')

    return {
      song_id: trackId,
      title,
      artist,
      album_id,
      album,
      cover_url: coverUrl,
      likes,
      favorites,
      comments,
      shares,
    }

  } catch (error) {
    console.error('Error parsing Douyin response:', error)
    console.error('Raw data:', JSON.stringify(data, null, 2))
    return null
  }
}

/**
 * 验证解析后的数据是否有效
 */
export function validateParsedSong(song: ParsedSongInfo | null): boolean {
  if (!song) {
    console.error('Song is null')
    return false
  }
  
  // 基本验证：只要有 song_id 和 title 就认为有效
  const isValid = song.song_id.length > 0 && song.title.length > 0
  
  if (!isValid) {
    console.error('Song validation failed:', {
      hasSongId: song.song_id.length > 0,
      hasTitle: song.title.length > 0,
      song
    })
  }
  
  return isValid
}

/**
 * 格式化数字显示（添加 K, M 等单位）
 */
export function formatCount(count: number): string {
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(1)}亿`
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`
  }
  return count.toString()
}