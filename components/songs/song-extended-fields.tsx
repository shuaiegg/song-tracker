
'use client';

import { useState, useEffect} from 'react';
import {Label} from '@/components/ui/label';
import {Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { SONG_EXTENDED_FIELDS, PRESET_GENRES } from '@/lib/song-fields-config';
import { SongFormData } from '@/types'
import { set } from 'react-hook-form';


interface SopngExtendedFieldsProps {
    formData: Partial<SongFormData>;
    onChange: (field: string, value: string | string []) => void;
    supervisor?: string;
    onSupervisorChange?: (value: string) => void;
}


export function SongExtendedFields({
    formData,
    onChange,
    supervisor,
    onSupervisorChange,
}: SopngExtendedFieldsProps) {
    // store suggestions for each field
    const [suggestions, setSuggestions] = useState<Record<string, string[]>>({})
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    //get suggestions for each field
    useEffect(()=> {
        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);

            const arrayFields = SONG_EXTENDED_FIELDS
                .filter(f => f.type === 'array' && f.key !== 'genres')
                .map(f => f.key)
            
            try {
                //get results
                const results = await Promise.all(
                    arrayFields.map( async (field) => {
                        const response = await fetch(`/api/songs/field-suggestions?field=${field}`)
                        if(response.ok){
                            const data = await response.json();
                            return { field, values: data.values}
                        }
                        return { field, values: []}
                    })

                )

                // changed to object
                const suggestionsMap: Record<string, string[]> = {};
                results.forEach(( {field, values }) => {
                    suggestionsMap[field] = values 
                })

                //music genres preset & history

                const genresResponse = await fetch('/api/songs/field-suggestions?field=genres')
                if(genresResponse.ok){
                    const genresData = await genresResponse.json();
                    const userGenres = genresData.values || [];
                    suggestionsMap.genres = [...new Set([...PRESET_GENRES, ...userGenres])]
                } else {
                    suggestionsMap.genres = PRESET_GENRES;
                }

            } catch (error) {
                console.error("get suggestions failed:", error)
                //
                setSuggestions({genres: PRESET_GENRES});
            } finally {
                setLoadingSuggestions(false);
            }
        }

        fetchSuggestions();
    }, [])


    return (
        <div className="space-y-4">
            <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">扩展信息</h3>
                <p className="text-sm text-muted-foreground mb-4">
                以下信息为可选项，可以帮助更好地管理和筛选歌曲
                </p>
            </div>



            {/* array fields */}
            {SONG_EXTENDED_FIELDS.filter(f => f.type === 'array').map((field) => (
                <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>

                    <TagInput
            value={(formData[field.key as keyof SongFormData] as string[]) || []}
            onChange={(tags) => onChange(field.key, tags)}
            placeholder={field.placeholder}
            suggestions={suggestions[field.key] || []}
          />

          {loadingSuggestions && suggestions[field.key]?.length === 0 && (
            <p className="text-xs text-muted-foreground">加载建议中...</p>
          )}
            </div>
            ))}
        {/* 专辑ID（单值文本） */}
      {/* <div className="space-y-2">
        <Label htmlFor="album_id">专辑ID</Label>
        <Input
          id="album_id"
          type="text"
          value={formData.album_id || ''}
          onChange={(e) => onChange('album_id', e.target.value)}
          placeholder="输入专辑ID"
        />
      </div> */}

      {onSupervisorChange && (
        <div className="space-y-2">
          <Label htmlFor="supervisor">
            负责人
            <span className="text-xs text-muted-foreground ml-2">
              （仅你可见）
            </span>
          </Label>
          <Input
            id="supervisor"
            type="text"
            value={supervisor || ''}
            onChange={(e) => onSupervisorChange(e.target.value)}
            placeholder="输入负责人名称"
          />
        </div>
      )}

        </div>
    );
}