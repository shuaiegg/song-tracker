// src/app/api/douyin/fetch-track/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get('track_id')

  if (!trackId) {
    return NextResponse.json(
      { error: '缺少歌曲 ID' },
      { status: 400 }
    )
  }

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_DOUYIN_API_BASE}?track_id=${trackId}`
    
    console.log('Fetching from Douyin API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Douyin API error:', response.status, response.statusText)
      return NextResponse.json(
        { error: `抖音 API 请求失败: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Douyin API response:', JSON.stringify(data, null, 2))

    // 返回原始数据，让客户端处理
    return NextResponse.json(data, { status: 200 })

  } catch (error) {
    console.error('Error fetching from Douyin API:', error)
    return NextResponse.json(
      { error: '获取歌曲信息失败，请稍后重试' },
      { status: 500 }
    )
  }
}