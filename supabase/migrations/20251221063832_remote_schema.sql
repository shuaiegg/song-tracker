


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_latest_stats"("song_uuid" "uuid") RETURNS TABLE("likes" bigint, "favorites" bigint, "comments" bigint, "shares" bigint, "fetched_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.likes,
        s.favorites,
        s.comments,
        s.shares,
        s.fetched_at
    FROM public.song_stats s
    WHERE s.song_id = song_uuid
    ORDER BY s.fetched_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_latest_stats"("song_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admins 
        WHERE user_id = user_uuid
    );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_daily_song_stats"("target_date" "date") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  yesterday DATE := target_date - 1;
  processed_count INT;
BEGIN
  -- 使用 CTE (公用表表达式) 高效查询
  WITH 
  -- 1. 获取“目标日期”每首歌的最后一条数据
  stats_today AS (
    SELECT DISTINCT ON (song_id) song_id, likes, favorites, comments, shares
    FROM song_stats
    WHERE fetched_at >= target_date::timestamp 
      AND fetched_at < (target_date + 1)::timestamp
    ORDER BY song_id, fetched_at DESC
  ),
  -- 2. 获取“前一天”每首歌的最后一条数据
  stats_yesterday AS (
    SELECT DISTINCT ON (song_id) song_id, likes, favorites, comments, shares
    FROM song_stats
    WHERE fetched_at >= yesterday::timestamp 
      AND fetched_at < target_date::timestamp
    ORDER BY song_id, fetched_at DESC
  ),
  -- 3. 计算增量
  calculations AS (
    SELECT 
      t.song_id,
      t.likes - COALESCE(y.likes, 0) as likes_diff,
      t.favorites - COALESCE(y.favorites, 0) as favorites_diff,
      t.comments - COALESCE(y.comments, 0) as comments_diff,
      t.shares - COALESCE(y.shares, 0) as shares_diff,
      CASE 
        WHEN COALESCE(y.likes, 0) > 0 THEN ((t.likes - y.likes)::float / y.likes) * 100 
        ELSE 0 
      END as change_rate
    FROM stats_today t
    LEFT JOIN stats_yesterday y ON t.song_id = y.song_id
  ),
  -- 4. 插入数据 (如果这首歌这天已存在，则忽略或更新)
  inserted AS (
    INSERT INTO daily_stats (song_id, date, likes, favorites, comments, shares, change_rate)
    SELECT 
      song_id, 
      target_date, 
      likes_diff, 
      favorites_diff, 
      comments_diff, 
      shares_diff, 
      change_rate
    FROM calculations
    ON CONFLICT (song_id, date) DO NOTHING -- 或者 DO UPDATE 更新
    RETURNING id
  )
  
  SELECT count(*) INTO processed_count FROM inserted;

  RETURN json_build_object(
    'status', 'success',
    'date', target_date,
    'processed_rows', processed_count
  );
END;
$$;


ALTER FUNCTION "public"."process_daily_song_stats"("target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_daily-rollup"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  service_role_key text;
  _url text;
  _key text;
BEGIN
  -- 这里需要使用 HTTP 扩展调用 Edge Function
  SELECT value INTO _url FROM private.app_config WHERE key = 'supabase_url';
  SELECT value INTO _key FROM private.app_config WHERE key = 'service_role_key';
  PERFORM
    net.http_post(
      url := _url || '/functions/v1/daily-rollup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
END;$$;


ALTER FUNCTION "public"."trigger_daily-rollup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_daily_rollup_http"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  -- 从 private.app_config 读取配置
  SELECT value INTO _url FROM private.app_config WHERE key = 'supabase_url';
  SELECT value INTO _key FROM private.app_config WHERE key = 'service_role_key';

  -- 使用 net.http_post 发送请求
  PERFORM
    net.http_post(
      -- 替换为你 Edge Function 的名字 (根据你的文件路径，这里应该是 daily-rollup)
      url := _url || '/functions/v1/daily-rollup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
END;
$$;


ALTER FUNCTION "public"."trigger_daily_rollup_http"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_fetch_rank_a"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  service_role_key text;
  _url text;
  _key text;
BEGIN
  -- 这里需要使用 HTTP 扩展调用 Edge Function
  SELECT value INTO _url FROM private.app_config WHERE key = 'supabase_url';
  SELECT value INTO _key FROM private.app_config WHERE key = 'service_role_key';
  PERFORM
    net.http_post(
      url := _url || '/functions/v1/fetch-rank-a',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
END;$$;


ALTER FUNCTION "public"."trigger_fetch_rank_a"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_fetch_rank_b"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  service_role_key text;
  _url text;
  _key text;
BEGIN
  -- 这里需要使用 HTTP 扩展调用 Edge Function
  SELECT value INTO _url FROM private.app_config WHERE key = 'supabase_url';
  SELECT value INTO _key FROM private.app_config WHERE key = 'service_role_key';
  PERFORM
    net.http_post(
      url := _url || '/functions/v1/fetch-rank-b',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
END;$$;


ALTER FUNCTION "public"."trigger_fetch_rank_b"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_fetch_rank_c"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  service_role_key text;
  _url text;
  _key text;
BEGIN
  -- 这里需要使用 HTTP 扩展调用 Edge Function
  SELECT value INTO _url FROM private.app_config WHERE key = 'supabase_url';
  SELECT value INTO _key FROM private.app_config WHERE key = 'service_role_key';
  PERFORM
    net.http_post(
      url := _url || '/functions/v1/fetch-rank-c',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )
    );
END;$$;


ALTER FUNCTION "public"."trigger_fetch_rank_c"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."app_config" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "private"."app_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admins_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_stats" (
    "id" bigint NOT NULL,
    "song_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "likes" bigint DEFAULT 0,
    "favorites" bigint DEFAULT 0,
    "comments" bigint DEFAULT 0,
    "shares" bigint DEFAULT 0,
    "change_rate" double precision DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."daily_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."daily_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."daily_stats_id_seq" OWNED BY "public"."daily_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."fetch_logs" (
    "id" bigint NOT NULL,
    "song_id" "uuid",
    "status" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fetch_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."fetch_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fetch_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fetch_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fetch_logs_id_seq" OWNED BY "public"."fetch_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."song_stats" (
    "id" bigint NOT NULL,
    "song_id" "uuid" NOT NULL,
    "likes" bigint DEFAULT 0,
    "favorites" bigint DEFAULT 0,
    "comments" bigint DEFAULT 0,
    "shares" bigint DEFAULT 0,
    "fetched_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."song_stats" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."song_stats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."song_stats_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."song_stats_id_seq" OWNED BY "public"."song_stats"."id";



CREATE TABLE IF NOT EXISTS "public"."songs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "song_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "artist" "text" NOT NULL,
    "album" "text",
    "cover_url" "text",
    "rank" "text" DEFAULT 'C'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "songs_rank_check" CHECK (("rank" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text"])))
);


ALTER TABLE "public"."songs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_song_relations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "song_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_song_relations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."daily_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."daily_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fetch_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fetch_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."song_stats" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."song_stats_id_seq"'::"regclass");



ALTER TABLE ONLY "private"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_song_id_date_key" UNIQUE ("song_id", "date");



ALTER TABLE ONLY "public"."fetch_logs"
    ADD CONSTRAINT "fetch_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."song_stats"
    ADD CONSTRAINT "song_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."songs"
    ADD CONSTRAINT "songs_song_id_key" UNIQUE ("song_id");



ALTER TABLE ONLY "public"."user_song_relations"
    ADD CONSTRAINT "user_song_relations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_song_relations"
    ADD CONSTRAINT "user_song_relations_user_id_song_id_key" UNIQUE ("user_id", "song_id");



CREATE INDEX "idx_admins_user_id" ON "public"."admins" USING "btree" ("user_id");



CREATE INDEX "idx_daily_stats_date" ON "public"."daily_stats" USING "btree" ("date" DESC);



CREATE INDEX "idx_daily_stats_song_date" ON "public"."daily_stats" USING "btree" ("song_id", "date" DESC);



CREATE INDEX "idx_daily_stats_song_id" ON "public"."daily_stats" USING "btree" ("song_id");



CREATE INDEX "idx_fetch_logs_created_at" ON "public"."fetch_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fetch_logs_song_id" ON "public"."fetch_logs" USING "btree" ("song_id");



CREATE INDEX "idx_fetch_logs_status" ON "public"."fetch_logs" USING "btree" ("status");



CREATE INDEX "idx_song_stats_fetched_at" ON "public"."song_stats" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_song_stats_song_fetched" ON "public"."song_stats" USING "btree" ("song_id", "fetched_at" DESC);



CREATE INDEX "idx_song_stats_song_id" ON "public"."song_stats" USING "btree" ("song_id");



CREATE INDEX "idx_songs_created_at" ON "public"."songs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_songs_rank" ON "public"."songs" USING "btree" ("rank");



CREATE INDEX "idx_songs_song_id" ON "public"."songs" USING "btree" ("song_id");



CREATE INDEX "idx_user_song_song_id" ON "public"."user_song_relations" USING "btree" ("song_id");



CREATE INDEX "idx_user_song_user_id" ON "public"."user_song_relations" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_stats"
    ADD CONSTRAINT "daily_stats_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fetch_logs"
    ADD CONSTRAINT "fetch_logs_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."song_stats"
    ADD CONSTRAINT "song_stats_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_song_relations"
    ADD CONSTRAINT "user_song_relations_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_song_relations"
    ADD CONSTRAINT "user_song_relations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete songs" ON "public"."songs" FOR DELETE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins")));



CREATE POLICY "Admins can update songs" ON "public"."songs" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins")));



CREATE POLICY "Admins can view all logs" ON "public"."fetch_logs" FOR SELECT USING (("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins")));



CREATE POLICY "Allow insert admin" ON "public"."admins" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated users can insert songs" ON "public"."songs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert stats" ON "public"."song_stats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Service role can insert logs" ON "public"."fetch_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage daily stats" ON "public"."daily_stats" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete own relations" ON "public"."user_song_relations" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins"))));



CREATE POLICY "Users can insert own relations" ON "public"."user_song_relations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view daily stats of their songs" ON "public"."daily_stats" FOR SELECT USING ((("song_id" IN ( SELECT "user_song_relations"."song_id"
   FROM "public"."user_song_relations"
  WHERE ("user_song_relations"."user_id" = "auth"."uid"()))) OR ("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins"))));



CREATE POLICY "Users can view own admin status" ON "public"."admins" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own relations" ON "public"."user_song_relations" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins"))));



CREATE POLICY "Users can view stats of their songs" ON "public"."song_stats" FOR SELECT USING ((("song_id" IN ( SELECT "user_song_relations"."song_id"
   FROM "public"."user_song_relations"
  WHERE ("user_song_relations"."user_id" = "auth"."uid"()))) OR ("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins"))));



CREATE POLICY "Users can view their tracked songs" ON "public"."songs" FOR SELECT TO "authenticated" USING ((("id" IN ( SELECT "user_song_relations"."song_id"
   FROM "public"."user_song_relations"
  WHERE ("user_song_relations"."user_id" = "auth"."uid"()))) OR ("auth"."uid"() IN ( SELECT "admins"."user_id"
   FROM "public"."admins"))));



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fetch_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."song_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."songs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_song_relations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."get_latest_stats"("song_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_latest_stats"("song_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_latest_stats"("song_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_daily_song_stats"("target_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."process_daily_song_stats"("target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_daily_song_stats"("target_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_daily-rollup"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_daily-rollup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_daily-rollup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_daily_rollup_http"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_daily_rollup_http"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_daily_rollup_http"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_a"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_a"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_a"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_b"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_b"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_b"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_c"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_c"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_fetch_rank_c"() TO "service_role";
























GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."daily_stats" TO "anon";
GRANT ALL ON TABLE "public"."daily_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fetch_logs" TO "anon";
GRANT ALL ON TABLE "public"."fetch_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fetch_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fetch_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fetch_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fetch_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."song_stats" TO "anon";
GRANT ALL ON TABLE "public"."song_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."song_stats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."song_stats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."song_stats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."song_stats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."songs" TO "anon";
GRANT ALL ON TABLE "public"."songs" TO "authenticated";
GRANT ALL ON TABLE "public"."songs" TO "service_role";



GRANT ALL ON TABLE "public"."user_song_relations" TO "anon";
GRANT ALL ON TABLE "public"."user_song_relations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_song_relations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































-- CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

-- CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

-- CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

-- CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

-- CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();

-- CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

-- CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


