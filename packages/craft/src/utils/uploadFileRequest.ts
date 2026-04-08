import type { AxiosProgressEvent } from 'axios'
import axios from 'axios'

export interface UploadFileRequestOptions {
  action: string
  file: File
  name?: string // formdata的name
  data?: Record<string, any>
  headers?: Record<string, any>
  withCredentials?: boolean
  onUploadProgress?: (percentage: number, event: AxiosProgressEvent) => void
}

export const action = 'http://123.57.138.48/api/upload/'

export const uploadFileRequest = async <T = unknown>({
  action,
  name,
  file,
  data = {},
  headers = {},
  withCredentials,
  onUploadProgress,
}: UploadFileRequestOptions): Promise<T> => {
  const formData = new FormData()
  // 保持和当前后端协议一致，不改字段结构
  formData.append(name ?? file.name, file, file.name)
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (value instanceof Blob) {
      formData.append(key, value)
      return
    }
    formData.append(key, String(value))
  })
  const response = await axios.post<T>(action, formData, {
    headers: {
      ...headers,
      // 'Content-Type': 'multipart/form-data', // 浏览器会自动补
    },
    withCredentials,
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return
      const percentage = Math.round((event.loaded / event.total) * 100)
      onUploadProgress(percentage, event)
    },
  })
  return response.data
}
