
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, X} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import { 
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { TagInput } from '@/components/ui/tag-input';





export interface FilterValues {
    search: string;
    artist: string;
    album: string;
    lyricists: string[];
    composers: string[];
    producers: string[];
    genres: string[];
    mixing_engineers: string[];
    recording_engineers: string[];
    rank: 'A' | 'B' | 'C' | 'all';
}

interface SongFiltersProps {
    filters: FilterValues;
    onFiltersChange: (filters: FilterValues) => void;
    onApplyFilters: () => void;
}

export function SongFilters({
    filters,
    onFiltersChange,
    onApplyFilters
}: SongFiltersProps) {

    // ✨ 使用 React Query 缓存字段建议
    const { data: suggestions = {} } = useQuery<Record<string, string[]>>({
        queryKey: ['field-suggestions-batch'],
        queryFn: async () => {
            const response = await fetch('/api/songs/field-suggestions-batch');
            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }
            return response.json();
        },
        staleTime: 10 * 60 * 1000, // 10 分钟
        gcTime: 30 * 60 * 1000, // 30 分钟
        retry: 1,
    })
    const [isOpen, setIsOpen] = useState(false);


    //update single filter option
    const updateFilter = (key: keyof FilterValues, value: any) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        })
    }

    //clear filter options
    const clearAllFilters = () => {
        onFiltersChange({
            search: '',
            artist: '',
            album: '',
            lyricists: [],
            composers: [],
            producers: [],
            genres: [],
            mixing_engineers: [],
            recording_engineers: [],
            rank: 'all',
        })
        onApplyFilters();
    }

    // calculate active filters count
    const activeFiltersCount = [
        filters.search ? 1 : 0,
        filters.artist ? 1 : 0,
        filters.album ? 1 : 0,
        filters.lyricists.length,
        filters.composers.length,
        filters.producers.length,
        filters.genres.length,
        filters.mixing_engineers.length,
        filters.recording_engineers.length,
        filters.rank !== 'all' ? 1 : 0,
    ].reduce((sum, count) => sum + count, 0);

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search  className="absolute left-3 top-1/2 - translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                        type="text"
                        placeholder="搜索歌名或歌手..."
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                        className="pl-9"
                        />
                </div>
                
                {/* advance filter options */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="relative">
                            <Filter className="h-4 w-4 mr-2" />
                            筛选
                            {activeFiltersCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                        {activeFiltersCount}
                                    </Badge>
                            )}
                        </Button>
                    </SheetTrigger>

                    <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>筛选歌曲</SheetTitle>
                            <SheetDescription>
                                根据以下条件筛选歌曲
                            </SheetDescription>
                        </SheetHeader>
                        
                        <div className="space-y-6 mt-6">
                            {/* Rank filter */}
                            <div className="space-y-2">
                                <Label>追踪频率 (Rank)</Label>
                                <Select
                                    value={filters.rank}
                                    onValueChange={(v) => updateFilter('rank', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部</SelectItem>
                                            <SelectItem value="A">Rank A</SelectItem>
                                            <SelectItem value="B">Rank B</SelectItem>
                                            <SelectItem value="C">Rank C</SelectItem>
                                        </SelectContent>
                                    </Select>
                            </div>

                            {/* composer filter */}
                            <div className="space-y-2">
                                <Label>作词</Label>
                                <TagInput
                                    value={filters.lyricists}
                                    onChange={(tags) => updateFilter('lyricists', tags)}
                                    placeholder="输入作词人"
                                    suggestions={suggestions['lyricists'] || []}
                                />
                            </div>

                            {/* 作曲 */}
              <div className="space-y-2">
                <Label>作曲</Label>
                <TagInput
                  value={filters.composers}
                  onChange={(tags) => updateFilter('composers', tags)}
                  placeholder="选择或输入作曲人"
                  suggestions={suggestions.composers || []}
                />
              </div>
              
              {/* 制作人 */}
              <div className="space-y-2">
                <Label>制作人</Label>
                <TagInput
                  value={filters.producers}
                  onChange={(tags) => updateFilter('producers', tags)}
                  placeholder="选择或输入制作人"
                  suggestions={suggestions.producers || []}
                />
              </div>
              
              {/* 音乐风格 */}
              <div className="space-y-2">
                <Label>音乐风格</Label>
                <TagInput
                  value={filters.genres}
                  onChange={(tags) => updateFilter('genres', tags)}
                  placeholder="选择或输入音乐风格"
                  suggestions={suggestions.genres || []}
                />
              </div>

              {/* 混音工程师 */}
              <div className="space-y-2">
                <Label>混音工程师</Label>
                <TagInput
                  value={filters.mixing_engineers}
                  onChange={(tags) => updateFilter('mixing_engineers', tags)}
                  placeholder="选择或输入混音工程师"
                  suggestions={suggestions.mixing_engineers || []}
                />
              </div>

              {/* 录音工程师 */}
              <div className="space-y-2">
                <Label>录音工程师</Label>
                <TagInput
                  value={filters.recording_engineers}
                  onChange={(tags) => updateFilter('recording_engineers', tags)}
                  placeholder="选择或输入录音工程师"
                  suggestions={suggestions.recording_engineers || []}
                />
              </div>


                {/* Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={clearAllFilters}
                    >
                        <X className="mr-2 h-4 w-4" />
                        清除所有筛选
                    </Button>
                    <Button 
                        onClick={() => {
                            onApplyFilters()
                            setIsOpen(false)
                        }}
                        className="flex-1"
                    >
                        应用筛选
                    </Button>
                </div>
            </div>
        </SheetContent>
                    
    </Sheet>

    {/* Search button */    }

    <Button onClick={onApplyFilters}>
        搜索
    </Button>
       </div>
    

     {/* 活跃筛选标签 */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">已应用筛选:</span>
          
          {filters.search && (
            <Badge variant="secondary">
              关键词: {filters.search}
              <button
                onClick={() => {
                  updateFilter('search', '')
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filters.rank !== 'all' && (
            <Badge variant="secondary">
              Rank: {filters.rank}
              <button
                onClick={() => {
                  updateFilter('rank', 'all')
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {/* {filters.singers.map((singer, i) => (
            <Badge key={`singer-${i}`} variant="secondary">
              歌手: {singer}
              <button
                onClick={() => {
                  updateFilter('singers', filters.singers.filter((_, idx) => idx !== i))
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))} */}
          
          {filters.producers.map((producer, i) => (
            <Badge key={`producer-${i}`} variant="secondary">
              制作人: {producer}
              <button
                onClick={() => {
                  updateFilter('producers', filters.producers.filter((_, idx) => idx !== i))
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.genres.map((genre, i) => (
            <Badge key={`genre-${i}`} variant="secondary">
              风格: {genre}
              <button
                onClick={() => {
                  updateFilter('genres', filters.genres.filter((_, idx) => idx !== i))
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.mixing_engineers.map((engineer, i) => (
            <Badge key={`mixing-${i}`} variant="secondary">
              混音: {engineer}
              <button
                onClick={() => {
                  updateFilter('mixing_engineers', filters.mixing_engineers.filter((_, idx) => idx !== i))
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          {filters.recording_engineers.map((engineer, i) => (
            <Badge key={`recording-${i}`} variant="secondary">
              录音: {engineer}
              <button
                onClick={() => {
                  updateFilter('recording_engineers', filters.recording_engineers.filter((_, idx) => idx !== i))
                  onApplyFilters()
                }}
                className="ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs"
          >
            清空全部
          </Button>
        </div>
      )}

        


     </div>
    )

}