//extend song fields config



export type SongFieldType = 'array' | 'text'

export interface SongFieldConfig {
    key: string;  // 字段键名
    label: string; // 字段标签
    type: SongFieldType; // 字段类型
    placeholder: string // 占位符
    required: boolean; // 是否必填
    showInList: boolean; // 是否在列表中显示
    searchable: boolean; // 是否可搜索
}

// song extention fields config

export const SONG_EXTENDED_FIELDS: SongFieldConfig[] = [
    // {
    //     key: 'singers',
    //     label: '歌手',
    //     type: 'array',
    //     placeholder: '请输入歌手，多个歌手用逗号分隔',
    //     required: false,
    //     showInList: true,
    //     searchable: true,
    // },
    {
        key: 'lyricists',
        label: '作词',
        type: 'array',
        placeholder: '请输入作词，多个作词用逗号分隔',
        required: false,
        showInList: false,
        searchable: true,
    },
    {
        key: 'composers',
        label: '作曲',
        type: 'array',
        placeholder: '输入作曲人，按回车添加多个',
        required: false,
        showInList: false,
        searchable: true,
    },
    {
    key: 'producers',
    label: '制作人',
    type: 'array',
    placeholder: '输入制作人，按回车添加多个',
    required: false,
    showInList: true,
    searchable: true,
  },
  {
    key: 'arrangers',
    label: '编曲',
    type: 'array',
    placeholder: '输入编曲人，按回车添加多个',
    required: false,
    showInList: false,
    searchable: true,
  },
  {
    key: 'mixing_engineers',
    label: '混音',
    type: 'array',
    placeholder: '输入混音师，按回车添加多个',
    required: false,
    showInList: false,
    searchable: false,
  },
  {
    key: 'recording_engineers',
    label: '录音',
    type: 'array',
    placeholder: '输入录音师，按回车添加多个',
    required: false,
    showInList: false,
    searchable: false,
  },
  {
    key: 'album_id',
    label: '专辑ID',
    type: 'text',
    placeholder: '输入专辑ID',
    required: false,
    showInList: false,
    searchable: false,
  },
  {
    key: 'genres',
    label: '音乐风格',
    type: 'array',
    placeholder: '选择或输入音乐风格标签',
    required: false,
    showInList: true,
    searchable: true,
  },

];

// 🎨 预设音乐风格标签（用户可以选择或自定义）
export const PRESET_GENRES = [
  '流行',
  '摇滚',
  '民谣',
  '电子',
  '说唱',
  '古风',
  'R&B',
  '爵士',
  '古典',
  '乡村',
  '金属',
  '朋克',
  '雷鬼',
  '蓝调',
  '舞曲',
  '嘻哈',
  '灵魂',
  '放克',
  '实验',
  '独立',
];


// 🔍 获取某个字段的配置
export function getFieldConfig(key: string): SongFieldConfig | undefined {
  return SONG_EXTENDED_FIELDS.find(f => f.key === key);
}

// 📋 获取可搜索的字段列表
export function getSearchableFields(): SongFieldConfig[] {
  return SONG_EXTENDED_FIELDS.filter(f => f.searchable);
}

// 👀 获取在列表中显示的字段
export function getListDisplayFields(): SongFieldConfig[] {
  return SONG_EXTENDED_FIELDS.filter(f => f.showInList);
}