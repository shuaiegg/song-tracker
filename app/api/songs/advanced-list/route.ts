// src/app/api/songs/advanced/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "未登录" }, { status: 401 });
        }

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

        /**
         * 1. 核心查询：从关联表出发
         * 使用 !inner 强制要求必须匹配到歌曲（Inner Join）
         * 这样即便 songIds 有几万个，也不会写在 URL 里，而是由数据库内部处理
         *
         * ✨ 优化：只查询最新的 song_stats（使用 ...limit(1)）
         */
        let query = supabase
            .from("user_song_relations")
            .select(`
                supervisor,
                songs!inner (
                    *,
                    song_stats (
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

        // 3. 执行查询
        // ✨ 优化：限制 song_stats 只返回最新的一条（使用 ...limit(1) 语法）
        const { data: rawRelations, error } = await query
            // 第一：对主表 user_song_relations 进行排序（该表有 created_at）
            .order("created_at", { ascending: false })
            // 第二：对关联的 songs 表进行排序
            .order("created_at", { referencedTable: "songs", ascending: false })
            // 第三：对 song_stats 进行排序（必须使用 fetched_at）
            .order("fetched_at", {
                referencedTable: "songs.song_stats",
                ascending: false,
            })
            // ✨ 限制每首歌只返回最新的一条 stats
            .limit(1, { referencedTable: "songs.song_stats" })
            // ✨ 设置主查询的限制，覆盖 Supabase 默认的 1000 行限制
            .limit(20000);

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
                // 取关联查询中排在第一位的 stats
                const latestStats = song.song_stats?.[0] || {
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
