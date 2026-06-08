// src/app/api/songs/advanced/route.ts
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "未登录" }, { status: 401 });
        }

        // 用 service role 客户端查数据，绕过 song_stats 的 RLS 逐行子查询开销
        // 鉴权已由上方 auth.getUser() 完成，下面所有查询都显式过滤 user_id
        const supabaseService = createServiceClient();

        const { searchParams } = new URL(request.url);

        // 提取参数
        const search = searchParams.get("search") || "";
        const artist = searchParams.get("artist") || "";
        const rank = searchParams.get("rank");

        // 数组类过滤参数
        const filters = {
            lyricists:
                searchParams.get("lyricists")?.split(",").filter(Boolean) || [],
            composers:
                searchParams.get("composers")?.split(",").filter(Boolean) || [],
            producers:
                searchParams.get("producers")?.split(",").filter(Boolean) || [],
            genres: searchParams.get("genres")?.split(",").filter(Boolean) ||
                [],
            mixing_engineers:
                searchParams.get("mixing_engineers")?.split(",").filter(
                    Boolean,
                ) || [],
            recording_engineers:
                searchParams.get("recording_engineers")?.split(",").filter(
                    Boolean,
                ) || [],
        };

        // 1. 核心查询：join latest_song_stats（每歌一行缓存），不再扫描历史统计表
        let query = supabaseService
            .from("user_song_relations")
            .select(`
                supervisor,
                created_at,
                songs!inner (
                    *,
                    latest_song_stats (
                        likes, favorites, comments, shares, fetched_at
                    )
                )
            `)
            .eq("user_id", user.id);

        // 2. 数据库级过滤：针对 songs 表的字段
        if (search.trim()) {
            query = query.or(
                `title.ilike.%${search}%,artist.ilike.%${search}%`,
                { foreignTable: "songs" },
            );
        }

        if (rank) {
            query = query.eq("songs.rank", rank);
        }

        // 3. 主查询（周变化已移至前端异步加载，不阻塞此响应）
        const { data: rawRelations, error } = await query
            .order("created_at", { ascending: false })
            .order("created_at", { referencedTable: "songs", ascending: false })
            .limit(30000);

        if (error) {
            console.error("Supabase query error:", error);
            throw error;
        }

        if (!rawRelations) {
            return NextResponse.json({ songs: [], total: 0 });
        }

        /**
         * 4. 数据清洗与高级过滤 (在内存中处理)
         * 因为 lyricists 等字段通常在 JS 里用 some/includes 过滤更灵活
         * 但为了性能，我们会在这里一次性完成所有操作
         */
        const processedSongs = rawRelations
            .map((rel: any) => {
                const song = rel.songs;
                // latest_song_stats 是 1:1 关系，PostgREST 返回对象而非数组
                const latestStats = song.latest_song_stats || {
                    likes: 0,
                    favorites: 0,
                    comments: 0,
                    shares: 0,
                    fetched_at: null,
                };

                return {
                    ...song,
                    latest_stats: latestStats,
                    supervisor: rel.supervisor,
                    relation_created_at: rel.created_at,
                };
            })
            .filter((song) => {
                // 批量处理数组过滤
                if (
                    artist &&
                    !song.artist?.toLowerCase().includes(artist.toLowerCase())
                ) return false;

                // 遍历校验所有数组字段
                for (const [key, selectedValues] of Object.entries(filters)) {
                    if (selectedValues.length > 0) {
                        const songValues = (song as any)[key] || [];
                        // 逻辑：只要包含用户选中的任何一个就通过 (OR 逻辑)
                        if (
                            !selectedValues.some((v) => songValues.includes(v))
                        ) return false;
                    }
                }
                return true;
            });

        processedSongs.sort((a, b) => {
            const likesA = a.latest_stats?.likes || 0;
            const likesB = b.latest_stats?.likes || 0;
            return likesB - likesA; // 降序：B - A
        });

        return NextResponse.json({
            songs: processedSongs,
            total: processedSongs.length,
        });
    } catch (error: any) {
        console.error("获取高级列表失败:", error);
        return NextResponse.json(
            { error: error.message || "获取失败" },
            { status: 500 },
        );
    }
}
