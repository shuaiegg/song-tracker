

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 获取歌曲字段建议的 API 路由
 * 依据用户已有的歌曲数据，提供字段自动补全建议
 */


export async function GET(request:Request) {
    try {
        const supabase  = await createClient();

        //verify user
        const { data: { user }} = await supabase.auth.getUser();
        if(!user){
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { searchParams} = new URL(request.url)

        const field = searchParams.get('field')

        if(!field){
            return NextResponse.json({ error: '缺少字段参数' }, { status: 400 });
        }

        //verify field is allowed

        const allowedFields = [
            'singers',
            'lyricists',
            'composers',
            'producers',
            'arrangers',
            'mixing_engineers',
            'recording_engineers',
            'genres'
        ]

        if(!allowedFields.includes(field)){
            return NextResponse.json({ error: '不支持的字段参数' }, { status: 400 });
        }

        // ✨ 优化：使用嵌套查询一次性获取数据
        const { data: relations, error } = await supabase
            .from('user_song_relations')
            .select(`songs!inner(${field})`)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching field suggestions:', error);
            return NextResponse.json({ field, values: [] });
        }

        if (!relations || relations.length === 0) {
            return NextResponse.json({ field, values: [] });
        }

        // 从嵌套结果中提取歌曲数据
        const songs = relations
            .map((rel: any) => rel.songs)
            .filter((song: any) => song && song[field] != null);

        //shuzu qu chong
        const allValues = new Set<string>();

        songs.forEach((song:any) => {
            const value = song[field]
            if(Array.isArray(value)){
                value.forEach(v => {
                    if(v && v.trim()) {
                        allValues.add(v.trim());
                    }
                })
            } else if(typeof value === 'string') {
                if(value.trim()) {
                    allValues.add(value.trim());
                }
            }
        
    })
    
    const uniqueValues = Array.from(allValues).sort((a, b) => a.localeCompare(b, 'zh-CN'))

    return NextResponse.json({
        field,
        values: uniqueValues,
        total: uniqueValues.length,
    })

    } catch (error) {
        console.error('Error fetching field suggestions:', error);
        return NextResponse.json(
            { error: '获取字段建议失败' },
            { status: 500 }
        );
    }
}