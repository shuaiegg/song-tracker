# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Song-tracker (歌曲数据追踪系统) is a professional music data analytics platform built with Next.js 16, Supabase, and React 19. The application tracks song metrics from Douyin (TikTok China) at different frequencies and provides comprehensive analytics for music professionals.

## Development Commands

```bash
# Development
npm run dev          # Start development server at http://localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint

# Supabase (requires Supabase CLI)
npx supabase start          # Start local Supabase
npx supabase status         # Check Supabase status
npx supabase db reset       # Reset database (apply all migrations)
npx supabase migration new <name>  # Create new migration
npx supabase functions deploy      # Deploy edge functions
```

## Architecture Overview

### Authentication System

**CRITICAL CONTEXT from TROUBLESHOOTING_AUTH.md:**
The app uses a **hybrid authentication approach** to work around unreliable `onAuthStateChange` events during login flows:

1. **Passive State Updates** (`AuthProvider`): `onAuthStateChange` handles routine session management (page refreshes, token refresh, logout events)
2. **Imperative State Updates** (Login Page): After successful server-side login, the client **manually** calls:
   - `supabase.auth.refreshSession()` to sync session from cookies
   - `supabase.auth.getSession()` to get updated session
   - `setUser(session.user)` to directly update Zustand store

**When modifying auth flow:**
- DO NOT rely solely on `onAuthStateChange` for post-login navigation
- Server actions (`app/(auth)/actions.ts`) should NOT call `redirect()` directly
- Login/signup pages must imperatively update auth state after successful server response
- See TROUBLESHOOTING_AUTH.md for detailed debugging history

### State Management

- **Global Auth State**: Zustand store (`store/auth-store.ts`)
  - Manages `user`, `isAdmin`, loading states
  - Used throughout app for authorization checks
  - Admin status checked via `/api/auth/is-admin` after user authenticated

- **Data Fetching & Caching**: React Query (`@tanstack/react-query`)
  - **Provider**: `QueryProvider` in `app/layout.tsx` wraps entire app
  - **Configuration**: 5min staleTime, 10min gcTime, auto-retry on failure
  - **Usage Pattern**: All client-side data fetching should use `useQuery`
  - **Cache Invalidation**: Use `queryClient.invalidateQueries()` after mutations
  - **Example**:
    ```tsx
    const { data, isLoading } = useQuery({
      queryKey: ['my-songs', user?.id],
      queryFn: () => fetch('/api/songs/my-songs').then(r => r.json()),
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    })
    ```

- **Server Components**: Use `createClient()` from `@/lib/supabase/server` for database queries
- **Client Components**: Use `createClient()` from `@/lib/supabase/client` for auth state and real-time features

### Database Schema

**Core Tables:**
- `songs`: Core song metadata (title, artist, album, cover_url, plus extended fields)
- `user_song_relations`: Many-to-many relationship between users and songs
  - `rank` field: 'A' (hourly), 'B' (6-hourly), 'C' (12-hourly) - determines fetch frequency
  - `supervisor`: Person responsible for tracking this song
- `song_stats`: Time-series metrics (likes, favorites, comments, shares, fetched_at)
- `daily_song_stats`: Daily rollup aggregates for historical analysis
- `admins`: Admin access control table; `lib/admin.ts` provides `checkIsAdmin(userId)` helper

**Extended Song Fields** (configured in `lib/song-fields-config.ts`):
- Arrays: `lyricists`, `composers`, `producers`, `arrangers`, `mixing_engineers`, `recording_engineers`, `genres`
- Text: `album_id`
- Each field has metadata: `type`, `label`, `placeholder`, `required`, `showInList`, `searchable`

### Data Fetching Architecture

**Automated Data Collection:**

1. **Supabase Edge Functions** (Deno runtime in `supabase/functions/`):
   - `fetch-rank-a`: Fetches Rank A songs (hourly via pg_cron)
   - `fetch-rank-b`: Fetches Rank B songs (every 6 hours)
   - `fetch-rank-c`: Fetches Rank C songs (every 12 hours)
   - `daily-rollup`: Aggregates yesterday's stats into `daily_song_stats` table
   - `fetch-songs-conveyor`: Worker function for batch processing

2. **Scheduling**: PostgreSQL `pg_cron` extension (see `supabase/pg_cron.md`)
   - Cron jobs trigger edge functions at configured intervals
   - Functions query Douyin API and insert records into `song_stats`

3. **API Routes** (`app/api/`):
   - `/api/douyin/fetch-track`: Calls `lib/parse-douyin-data.ts` to extract structured song data from raw Douyin API response (reads from `seo_track` key)
   - `/api/songs/*`: CRUD operations for songs and user relations
   - `/api/admin/*`: Admin-only operations (trigger manual fetches, user management)

### UI Components

**Component Structure:**
- `components/ui/`: shadcn/ui components (button, card, dialog, table, etc.)
- `components/songs/`: Song-specific components
  - `song-list.tsx`: Main song list view
  - `virtual-songs-table.tsx`: Virtualized table for performance (@tanstack/react-virtual)
  - `add-song-form.tsx`: Add single song
  - `batch-upload-dialog.tsx`: Excel batch upload (uses `xlsx` library)
  - `song-filters.tsx`: Advanced filtering by extended fields
  - `update-rank-dialog.tsx`: Change tracking frequency

**Charts** (`components/charts/`):
- `stats-chart.tsx`: Hourly/recent stats time-series chart
- `daily-stats-chart.tsx`: Daily rollup historical chart
- `stat-cards.tsx`: Summary metric cards
- Uses `recharts` library for all visualizations

**Form Handling:**
- `react-hook-form` + `zod` for form validation throughout the app
- `sonner` (`toast()`) for user feedback/toast notifications

**Styling:**
- Tailwind CSS v4 with `@tailwindcss/postcss`
- Dark mode via `next-themes`
- Custom animations via `tailwindcss-animate`

### Batch Upload System

**Template Format** (`lib/batch-upload-template.ts`):
- Excel files with columns: `song_id` (required), `rank` (required), `title`, `artist`, `album`, and all extended fields
- Supports comma-separated values for array fields
- Downloads template with example rows via `XLSX.writeFile()`
- Upload endpoint: `/api/songs/batch-upload`

### Key Routing Patterns

```
/                          → Landing page (redirects to /dashboard if authenticated)
/(auth)/login              → Login page
/(auth)/callback           → OAuth callback handler
/dashboard                 → Main dashboard with stats and song list
/dashboard/songs-list      → Full song list with virtual scrolling
/dashboard/songs/[id]      → Individual song detail page with historical charts
/admin                     → Admin panel (requires isAdmin=true)
```

**Middleware** (`middleware.ts`):
- Uses `@supabase/ssr` to update session on every request
- Handles auth token refresh automatically

### TypeScript Types & Hooks

- **`types/index.ts`**: Central type definitions — `RankType`, `Song`, `SongStats`, `DailyStats`, `UserSongRelation`, `SongFormData`, `ParsedSongInfo`, `DouyinApiResponse`
- **`hooks/use-fetch-song.ts`**: Custom hook for fetching/previewing a Douyin track by ID before adding it

## Important Development Notes

### Working with Extended Fields

When adding/modifying extended song fields:
1. Update `SONG_EXTENDED_FIELDS` in `lib/song-fields-config.ts`
2. Create database migration to add column (see `supabase/migrations/`)
3. Update batch upload template in `lib/batch-upload-template.ts`
4. Update TypeScript types if using typed database client

### Performance Considerations

- **Song List**: Uses `@tanstack/react-virtual` for virtualizing large datasets (500+ songs)
- **API Queries**: Advanced list endpoint (`/api/songs/advanced-list/route.ts`) uses Supabase's `!inner` join syntax to filter efficiently
- **Caching**: Uses `@tanstack/react-query` for client-side data caching (5min stale, 10min GC)

**Avoiding N+1 Queries (CRITICAL):**

When fetching songs with their latest stats, always use nested queries instead of loops:

```typescript
// ❌ BAD: N+1 queries (1 + N database calls)
const songs = await supabase.from('songs').select('*')
for (const song of songs) {
  const stats = await supabase.from('song_stats').select('*').eq('song_id', song.id)
}

// ✅ GOOD: Single query with nested relations
const { data } = await supabase
  .from('user_song_relations')
  .select(`
    songs!inner (
      *,
      song_stats (likes, comments, shares, fetched_at)
    )
  `)
  .eq('user_id', user.id)
  .order('fetched_at', { referencedTable: 'songs.song_stats', ascending: false })

// Get latest stats per song (first in array due to ordering)
const songsWithStats = data.map(rel => ({
  ...rel.songs,
  latest_stats: rel.songs.song_stats?.[0] || defaultStats
}))
```

**API Pagination:**
- Default limit should be small (10-50) to reduce initial load time
- Use `?page=1&limit=10` parameters for pagination
- Return `total`, `page`, `limit`, `totalPages` for client-side pagination UI

### Supabase Configuration

Required environment variables (in `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

For Supabase Edge Functions:
```bash
npx supabase secrets set DOUYIN_API_KEY=<your-key>
```

## Testing Manual Fetches

Admins can manually trigger data fetches:
1. Navigate to Dashboard
2. Use `TriggerFetch` component (shown to admins only)
3. Or call `/api/admin/trigger-fetch?rank=A` directly

## Common Gotchas

1. **Auth State Race Conditions**: Always use imperative state updates after login/signup server actions (see TROUBLESHOOTING_AUTH.md)
2. **N+1 Query Performance**: NEVER loop through results to fetch related data. Always use Supabase nested queries with proper ordering (see Performance Considerations)
3. **React Query Cache**: After mutations (add/delete/update), call `queryClient.invalidateQueries()` to refresh affected data. Don't manually refetch.
4. **Array Field Parsing**: Extended fields stored as PostgreSQL arrays - use `.split(',')` when uploading from Excel
5. **Rank Changes**: Updating song rank requires updating `user_song_relations.rank`, which affects future fetch schedules
6. **Edge Function CORS**: All edge functions must include CORS headers for preflight requests
7. **API Pagination**: Always set reasonable default limits (10-50) in API endpoints to avoid loading thousands of records
8. **Chinese Characters**: UI is in Chinese (Simplified) - song titles, artist names, and labels use Chinese text
