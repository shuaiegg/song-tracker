'use client';

import {useState, KeyboardEvent, useEffect} from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';



interface TagInputProps
 {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    suggestions?:string[];
    className?:string
 }



export function TagInput({
    value = [],
    onChange,
    placeholder = '输入输入后按回车添加',
    suggestions = [],
    className,
    }: TagInputProps) {
    
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

    //filter suggestion

    useEffect(() => {
        if(inputValue.trim() && suggestions.length > 0) {
            const filtered = suggestions.filter( 
                s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
            )
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0)
        } else {
            setShowSuggestions(false);
        }
    },[inputValue, suggestions, value])


    //add tags
    const addTag = ( tag: string) => {
        const trimmed = tag.trim();
        if(trimmed && !value.includes(trimmed)){
            onChange([...value, trimmed])
        }
        setInputValue('');
        setShowSuggestions(false);
    }

    //delete tag
    const removeTag = (index:number) => {
        onChange(value.filter((_,i) => i !== index))
    }
    

    //habndle keyboard event
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0){
            removeTag(value.length -1);
        }
    }
    
    return (
        <div className={cn('relative', className)}>
           {/*  tag added  */}
           <div className="flex flex-wrap gap-2 mb-2">
            {value.map((tag,index) => (
                <Badge
                    key={index}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 text-sm"
                    >
                    {tag}
                    <button type="button" onClick={()=>removeTag(index)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                        <X className="h-3 w-3" />
                    </button>

                </Badge>        
            ))}
           </div>
            {/* input fields */} 
            <Input 
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={()=> inputValue && setShowSuggestions(filteredSuggestions.length > 0)}
                onBlur = {() => setTimeout(()=> setShowSuggestions(false), 200)}
                placeholder={placeholder}
                />

            {/* suggestions auto complecation */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={()=> addTag(suggestion)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors "
                            >
                                {suggestion}
                            </button>
                    ))}
                
                </div>   
            )}
        </div>
    )
}