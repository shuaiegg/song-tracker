import * as XLSX from 'xlsx'

/*s*
 * 批量上传模板相关工具
 */

//define template columns

export const TEMPLATE_COLUMNS = [
    {key: 'song_id', label: '歌曲ID', required: true},
    { key: 'album_id', label: '专辑ID', required: false },
    { key: 'rank', label: '追踪频率*', required: true },
    { key: 'title', label: '歌名', required: false },
    { key: 'artist', label: '歌手名', required: false },
    { key: 'album', label: '专辑', required: false },
    { key: 'lyricists', label: '作词(多个用逗号分隔)', required: false },
    { key: 'composers', label: '作曲(多个用逗号分隔)', required: false },
    { key: 'producers', label: '制作人(多个用逗号分隔)', required: false },
    { key: 'arrangers', label: '编曲(多个用逗号分隔)', required: false },
    { key: 'mixing_engineers', label: '混音(多个用逗号分隔)', required: false },
    { key: 'recording_engineers', label: '录音(多个用逗号分隔)', required: false },
    { key: 'genres', label: '音乐风格(多个用逗号分隔)', required: false },
    { key: 'supervisor', label: '负责人', required: false },
]


// 示例数据
export const EXAMPLE_ROWS = [
  {
    song_id: '7234567890123456789',
    rank: 'A',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    lyricists: '周杰伦',
    composers: '周杰伦',
    producers: '周杰伦',
    // arrangers: '钟兴民',
    mixing_engineers: '杨大纬',
    recording_engineers: '',
    album_id: '',
    genres: '流行,抒情',
    supervisor: '张三',
  },
  {
    song_id: '7234567890123456790',
    rank: 'B',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    lyricists: '方文山',
    composers: '周杰伦',
    producers: '周杰伦',
    // arrangers: '钟兴民',
    mixing_engineers: '',
    recording_engineers: '',
    album_id: '',
    genres: '流行,R&B',
    supervisor: '李四',
  },
  {
    song_id: '7234567890123456791',
    rank: 'C',
    title: '稻香',
    artist: '周杰伦',
    album: '魔杰座',
    lyricists: '周杰伦',
    composers: '周杰伦',
    producers: '周杰伦',
    // arrangers: '黄雨勋',
    mixing_engineers: '',
    recording_engineers: '',
    album_id: '',
    genres: '流行,民谣',
    supervisor: '',
  },
]

//generate CSV template content
export function generateCSVTemplate():string {
    const headers = TEMPLATE_COLUMNS.map(col => col.label).join(',')
    const exampleRows = EXAMPLE_ROWS.map(row =>
        TEMPLATE_COLUMNS.map( col => {
            const value = row[col.key as keyof typeof row] || ''
            //if value contains comma, wrap it with double quotes
            return value.includes(',')?`"${value}"` : value
        }).join(',')
    ).join('\n')

    return `${headers}\n${exampleRows}`
}

//download CSV template file
export function downloadCSVTemplate() {
    const csv = generateCSVTemplate();
    const blob = new Blob(['\ufeff' + csv], {type: 'text/csv; charset=utf-8;'})
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', '歌曲批量上传模板.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

//parse CSV file
export function parseCSV(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2)  return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
    const rows: any[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if( values.length !== headers.length ) continue

        const row: any = {}

        headers.forEach((header, index) => {
            //find keys
            const column = TEMPLATE_COLUMNS.find(col => col.label === header)

            if(column) {
                row[column.key] = values[index].trim()
            }
        })

        rows.push(row)
    }
    return rows
}

//parse csv row

function parseCSVLine(line: string): string[]{
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for(let i = 0; i < line.length; i++) {
        const char = line[i]

        if(char === '"') {
            inQuotes = !inQuotes
        } else if(char === ',' && !inQuotes) {
            result.push(current)
            current =''
        } else {
            current += char
        }
    }

    result.push(current)
    return result.map(v => v.replace(/^"|"$/g,''))
}

//verify uploaded data
export interface ValidationError {
    row: number
    field: string
    message: string
}

export function validateUploadData(rows: any[]): ValidationError[] {
    const errors: ValidationError[] = []

    rows.forEach((row, index) => {
        const rowNum = index + 2 //header container 2

        //valify required fields
        if(!row.song_id || !row.song_id.trim()) {
            errors.push({
                row: rowNum,
                field: 'song_id',
                message: '歌曲ID不能为空',
            })
        }

        if(!row.rank || !row.rank.trim()) {
            errors.push({
                row: rowNum,
                field: 'rank',
                message: '追踪频率不能为空',
            })
        } else if(!['A', 'B', 'C'].includes(row.rank.toUpperCase())){
            errors.push({
            row: rowNum,
            field: 'rank',
            message: '追踪频率必须是 A、B 或 C',
      })
    }

    //verify song_id(should be number)

    if(row.song_id && !/^\d+$/.test(row.song_id.trim())){
        errors.push({
            row: rowNum,
            field: 'song_id',
            message: '歌曲ID格式无效（应该是纯数字）',
        })
    }

    })

    return errors
}

// 转换上传数据为标准格式
export function transformUploadData(rows: any[]): any[] {
  return rows.map(row => {
    // 处理数组字段（逗号分隔的字符串转为数组）
    const arrayFields = [
      'singers',
      'lyricists',
      'composers',
      'producers',
      'arrangers',
      'mixing_engineers',
      'recording_engineers',
      'genres',
    ]
    
    const transformed: any = {
      song_id: row.song_id?.trim(),
      rank: row.rank?.toUpperCase(),
      title: row.title?.trim() || '',
      artist: row.artist?.trim() || '',
      album: row.album?.trim() || '',
      album_id: row.album_id?.trim() || '',
      supervisor: row.supervisor?.trim() || '',
    }
    
    // 转换数组字段
    arrayFields.forEach(field => {
      if (row[field] && row[field].trim()) {
        transformed[field] = row[field]
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean)
      } else {
        transformed[field] = []
      }
    })
    
    return transformed
  })
}



// 生成 Excel 模板并下载
export function downloadExcelTemplate() {
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  // 准备数据（表头 + 示例数据）
  const headers = TEMPLATE_COLUMNS.map(col => col.label)
  const data = [
    headers,
    ...EXAMPLE_ROWS.map(row => 
      TEMPLATE_COLUMNS.map(col => row[col.key as keyof typeof row] || '')
    )
  ]
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(data)
  
  // 设置列宽
  const colWidths = TEMPLATE_COLUMNS.map(col => {
    if (col.key === 'song_id') return { wch: 20 }
    if (col.key.includes('engineer')) return { wch: 25 }
    return { wch: 15 }
  })
  ws['!cols'] = colWidths
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '歌曲列表')
  
  // 下载文件
  XLSX.writeFile(wb, '歌曲批量上传模板.xlsx')
}

// 解析 Excel 文件
// 解析 Excel 文件
export async function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' }) // ✅ 改用 array 类型
        
        // 读取第一个工作表
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        
        // 转换为 JSON（第一行作为表头）
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        if (jsonData.length < 2) {
          resolve([])
          return
        }
        
        // 第一行是表头
        const headers = jsonData[0] as string[]
        const rows: any[] = []
        
        // 从第二行开始是数据
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i] as any[]
          if (!values || values.length === 0) continue
          
          const row: any = {}
          headers.forEach((header, index) => {
            // 找到对应的字段key
            const column = TEMPLATE_COLUMNS.find(col => col.label === header)
            if (column && values[index] !== undefined) {
              row[column.key] = String(values[index]).trim()
            }
          })
          
          // 只添加有数据的行
          if (row.song_id) {
            rows.push(row)
          }
        }
        
        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsArrayBuffer(file) // ✅ 改用 readAsArrayBuffer
  })
}

// 统一的文件解析接口
export async function parseUploadFile(file: File): Promise<any[]> {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.csv')) {
    // 解析 CSV
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const rows = parseCSV(content)
          resolve(rows)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => {
        reject(new Error('文件读取失败'))
      }
      
      reader.readAsText(file, 'UTF-8')
    })
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    // 解析 Excel
    return parseExcel(file)
  } else {
    throw new Error('不支持的文件格式，请上传 .csv 或 .xlsx 文件')
  }
}