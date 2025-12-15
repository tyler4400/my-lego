export type UploadStaus = 'ready' | 'loading' | 'success' | 'error'
export type FileListType = 'picture' | 'text'

export interface UploadFile {
  uid: string
  size: number
  name: string
  status: UploadStaus
  raw: File
  resp?: any
  url?: string
  percent?: number
  response?: any
  error?: any
}
export type CheckUpload = (file: File) => boolean | Promise<File>

export interface UploaderProps {
  action: string
  beforeUpload?: CheckUpload
  drag?: boolean // default: false
  autoUpload?: boolean // default: true
  listType?: FileListType // default: 'text'
  showUploadList?: boolean // default: true
  withCredentials?: boolean
  headers?: { [key: string]: any }
  data?: { [key: string]: any } // 上传信息
}

export interface UploaderEmits {
  success: [{ resp: any, file: UploadFile, list: UploadFile[] }]
  error: [{ err: any, file: UploadFile, list: UploadFile[] }]
}

export interface UploaderSlots {
  loading?: () => void
  default?: () => void
  uploaded?: () => void
}
