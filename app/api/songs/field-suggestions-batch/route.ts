// app/api/songs/field-suggestions-batch/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 批量获取多个字段建议的 API 路由
 * 一次性返回所有字段的建议值，提升性能
 */

// ✨ 启用缓存（5分钟）
export const revalidate = 300;

export async function GET() {
    try {
        const supabase = await createClient();

        // 验证用户
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        // 定义所有允许的字段
        const allowedFields = [
            'lyricists',
            'composers',
            'producers',
            'arrangers',
            'mixing_engineers',
            'recording_engineers',
            'genres'
        ];

        // ✨ 使用一次嵌套查询获取所有字段
        const { data: relations, error } = await supabase
            .from('user_song_relations')
            .select(`songs!inner(${allowedFields.join(', ')})`)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching batch suggestions:', error);
            return NextResponse.json({ error: '获取字段建议失败' }, { status: 500 });
        }

        if (!relations || relations.length === 0) {
            // 返回空结果
            const emptyResult: Record<string, string[]> = {};
            allowedFields.forEach(field => {
                emptyResult[field] = [];
            });
            return NextResponse.json(emptyResult);
        }

        // 提取所有歌曲
        const songs = relations.map((rel: any) => rel.songs);

        // 为每个字段收集唯一值
        const result: Record<string, string[]> = {};

        allowedFields.forEach(field => {
            const allValues = new Set<string>();

            songs.forEach((song: any) => {
                const value = song[field];
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        if (v && v.trim()) {
                            allValues.add(v.trim());
                        }
                    });
                } else if (typeof value === 'string' && value.trim()) {
                    allValues.add(value.trim());
                }
            });

            // 排序并存储
            result[field] = Array.from(allValues).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in batch field suggestions:', error);
        return NextResponse.json(
            { error: '获取字段建议失败' },
            { status: 500 }
        );
    }
}
