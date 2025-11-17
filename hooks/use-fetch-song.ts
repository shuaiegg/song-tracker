// src/hooks/use-fetch-song.ts
import { useState } from 'react'
import { ParsedSongInfo } from '@/types'
import { parseDouyinResponse, validateParsedSong } from '@/lib/parse-douyin-data'

interface UseFetchSongResult {
  fetchSong: (trackId: string) => Promise<ParsedSongInfo | null>
  isLoading: boolean
  error: string | null
}

export function useFetchSong(): UseFetchSongResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSong = async (trackId: string): Promise<ParsedSongInfo | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/douyin/fetch-track?track_id=${trackId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取歌曲信息失败')
      }

      const data = await response.json()
      console.log('Received data from API:', data)

      const parsed = parseDouyinResponse(data, trackId)
      
      if (!validateParsedSong(parsed)) {
        throw new Error('无法解析歌曲信息，请检查歌曲 ID 是否正确')
      }

      return parsed

    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setError(message)
      console.error('Error in useFetchSong:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { fetchSong, isLoading, error }
}