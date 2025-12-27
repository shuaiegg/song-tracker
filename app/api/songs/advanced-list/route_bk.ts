

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 高级歌曲列表的 API 路由
 * 提供分页、排序和过滤功能
 */
 export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        // 验证用户身份
        const { data: { user }} = await supabase.auth.getUser();

        if(!user) {
            return NextResponse.json({error: '未登录'}, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        const search = searchParams.get('search') || '';
        const artist = searchParams.get('artist') || '';
        const lyricists = searchParams.get('lyricists')?.split(',').filter(Boolean) || [];
        const composers = searchParams.get('composers')?.split(',').filter(Boolean) || [];
        const producers = searchParams.get('producers')?.split(',').filter(Boolean) || [];
        const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
        const mixing_engineers = searchParams.get('mixing_engineers')?.split(',').filter(Boolean) || [];
        const recording_engineers = searchParams.get('recording_engineers')?.split(',').filter(Boolean) || [];
        const rank = searchParams.get('rank') as 'A' | 'B' | 'C' | null

        //1st get user's tracking song IDS
        const { data: relations } = await supabase
            .from('user_song_relations')
            .select('song_id, supervisor')
            .eq('user_id', user.id);

        if(!relations || relations.length === 0 ) {
            return NextResponse.json({
                songs: [],
                total: 0
            })
        }

        const songIds = relations.map(r => r.song_id)

        //2nd construct query for songs table

        let query = supabase
            .from('songs')
            .select('*')
            .in('id', songIds);

        //3rd apply filters

        if( search.trim()) {
            query = query.or(`title.ilike.%${search}%, artist.ilike.%${search}%`)
        }

        //4th apply rank filter

        if(rank) {
            query = query.eq('rank', rank)
        }

        //5th query 
        const { data: songs, error } = await query.order('created_at', { ascending: false})

        if (error) {
            throw error;
        }

        if(!songs || songs.length === 0) {
            return NextResponse.json({
                songs: [],
                total: 0,
            })
        }

        //6th apply advanced filters in array
        let filteredSongs = songs;

        if (artist.trim()) {
            filteredSongs = filteredSongs.filter(song => song.artist.toLowerCase().includes(artist.toLowerCase()));
        }

        if(lyricists.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.lyricists || song.lyricists.length === 0) return false;
                return lyricists.some(l => song.lyricists.includes(l));
            })
        }

        if(composers.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.composers || song.composers.length === 0) return false;
                return composers.some(c => song.composers.includes(c));
            })
        }
        
        if(producers.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.producers || song.producers.length === 0) return false;
                return producers.some(p => song.producers.includes(p));
            })
        }
        if(genres.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.genres || song.genres.length === 0) return false;
                return genres.some(g => song.genres.includes(g));
            })
        }

        if(mixing_engineers.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.mixing_engineers || song.mixing_engineers.length === 0) return false;
                return mixing_engineers.some(m => song.mixing_engineers.includes(m));
            })
        }

        if(recording_engineers.length > 0) {
            filteredSongs = filteredSongs.filter(song => {
                if (!song.recording_engineers || song.recording_engineers.length === 0) return false;
                return recording_engineers.some(r => song.recording_engineers.includes(r));
            })
        }

        //6. get statics and supervisor
        const songsWithStats = await Promise.all(
            filteredSongs.map( async (song) => {
                // get newest stats
                const { data: latestStats } = await supabase
                    .from('song_stats')
                    .select('*')
                    .eq('song_id', song.song_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const relation = relations.find( r => r.song_id === song.id)

                return {
                    ...song,
                    latest_stats: latestStats || {
                        likes: 0,
                        favorites: 0,
                        comments: 0,
                        shares: 0,
                        fetched_at: null,
                    },
                    supervisor: relation?.supervisor || null,
                }
            })
        )

        return NextResponse.json({
            songs: songsWithStats,
            total: songsWithStats.length,
        })

    } catch (error:any) {

        console.error('获取高级列表失败:', error)
        return NextResponse.json(
            { error: error.message || '获取失败' },
            { status: 500 }
        )
    }
 } 
