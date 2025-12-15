<template>
  <div class="file-upload">
    <div
      class="upload-area"
      :class="{ 'is-dragover': drag && isDragOver }"
      v-on="events"
    >
      <slot v-if="isUploading" name="loading">
        <Button disabled>
          <LoadingOutlined />
          正在上传
        </Button>
      </slot>
      <slot
        v-else-if="lastFileData && lastFileData.loaded"
        name="uploaded"
        :uploadedData="lastFileData.data"
      >
        <Button>
          <UploadOutlined />
          点击上传
        </Button>
      </slot>
      <slot v-else name="default">
        <Button>
          <UploadOutlined />
          点击上传
        </Button>
      </slot>
    </div>
    <input
      ref="fileInput"
      type="file"
      :style="{ display: 'none' }"
      @change="handleFileChange"
    >
    <ul v-if="showUploadList" class="upload-list">
      <li
        v-for="file in uploadedFiles"
        :key="file.uid"
        :class="`uploader-file upload-${file.status}`"
      >
        <img
          v-if="file.url && listType === 'picture'"
          class="upload-list-thumbnail"
          :src="file.url"
          :alt="file.name"
        >
        <span v-if="file.status === 'loading'" class="file-icon">
          <LoadingOutlined />
        </span>
        <span v-else class="file-icon"><FileOutlined /></span>
        <span class="filename">{{ file.name }}</span>
        <span class="delete-icon" @click="removeFile(file.uid)">
          <DeleteOutlined />
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { AxiosProgressEvent } from 'axios'
import type { UploaderEmits, UploaderProps, UploadFile } from '@/components/Uploader/types.ts'
import { DeleteOutlined, FileOutlined, LoadingOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { isFunction } from '@my-lego/shared'
import { Button } from 'ant-design-vue'
import axios from 'axios'
import { last } from 'lodash-es'
import { v4 as uuidv4 } from 'uuid'
import { computed, reactive, ref, useTemplateRef } from 'vue'

const {
  action,
  beforeUpload,
  drag = false,
  autoUpload = true,
  listType = 'text',
  showUploadList = true,
  withCredentials,
  headers = {},
  data = {},
} = defineProps<UploaderProps>()
const emit = defineEmits<UploaderEmits>()

const fileInputEl = useTemplateRef('fileInput')

const uploadedFiles = reactive<UploadFile[]>([])
const updateFileList = (file: UploadFile, updateObj: Partial<UploadFile>) => {
  const index = uploadedFiles.findIndex(item => item.uid === file.uid)
  uploadedFiles.splice(index, 1, { ...uploadedFiles[index], ...updateObj } as UploadFile)
}

const isUploading = computed(() => {
  return uploadedFiles.some(file => file.status === 'loading')
})

const lastFileData = computed(() => {
  const lastFile = last(uploadedFiles)
  if (lastFile) {
    return {
      loaded: lastFile.status === 'success',
      data: lastFile.resp,
    }
  }
  return false
})

const postFile = (file: UploadFile) => {
  const formData = new FormData()
  formData.append(file.name, file.raw)
  if (data) {
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })
  }

  axios.post(action, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    withCredentials,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total) {
        const percentage = Math.round((event.loaded / event.total) * 100)
        if (percentage < 100) {
          updateFileList(file, { percent: percentage, status: 'loading' })
          // onProgress?.(percentage, file)
        }
      }
    },
  }).then((response) => {
    updateFileList(file, { status: 'success', response: response.data, percent: 100 })
    emit('success', { resp: response.data, file, list: uploadedFiles })
    // onSuccess?.(response.data, file)
    // onChange?.(file)
  }).catch((err) => {
    updateFileList(file, { status: 'error', error: err })
    emit('error', { err, file, list: uploadedFiles })
    // onError?.(error, file)
    // onChange?.(file)
  }).finally(() => {
    if (fileInputEl.value) {
      fileInputEl.value.value = ''
    }
  })
}

const addFileToList = (uploadedFile: File) => {
  const fileObj: UploadFile = {
    uid: uuidv4(),
    size: uploadedFile.size,
    name: uploadedFile.name,
    status: 'ready',
    raw: uploadedFile,
  }
  if (listType === 'picture') {
    try {
      fileObj.url = URL.createObjectURL(uploadedFile)
    }
    catch (e) {
      console.error('upload file error:', e)
    }
  }
  uploadedFiles.push(fileObj)
  if (autoUpload) {
    postFile(fileObj)
  }
}

const beforeUploadCheck = (files: FileList) => {
  // 暂时不支持 multiple
  if (files[0]) {
    const uploadedFile = files[0]
    if (isFunction(beforeUpload)) {
      const result = beforeUpload(uploadedFile)
      if (result && result instanceof Promise) {
        result
          .then((processedFile) => {
            if (processedFile instanceof File) {
              addFileToList(processedFile)
            }
            else {
              throw new TypeError('beforeUpload Promise must return a File')
            }
          })
          .catch((e) => {
            console.error(e)
          })
      }
      else if (result) {
        addFileToList(uploadedFile)
      }
      else {
        console.error('beforeUpload must return a Promise or true')
      }
    }
    else {
      addFileToList(uploadedFile)
    }
  }
}

const handleFileChange = (e: Event) => {
  const fileInput = e.target as HTMLInputElement
  const files = fileInput.files
  if (!files || !files.length) return

  beforeUploadCheck(files)
}

const removeFile = (id: string) => {
  const index = uploadedFiles.findIndex(item => item.uid === id)
  uploadedFiles.splice(index, 1)
}

const uploadFiles = () => {
  uploadedFiles
    .filter(file => file.status === 'ready')
    .forEach(readyFile => postFile(readyFile))
}

const triggerUpload = () => {
  if (fileInputEl.value) {
    fileInputEl.value.click()
  }
}

const isDragOver = ref(false)
let events: { [k: string]: (e: any) => void } = {
  click: triggerUpload,
}

const handleDrag = (e: DragEvent, over: boolean) => {
  e.preventDefault()
  isDragOver.value = over
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  if (e.dataTransfer) {
    beforeUploadCheck(e.dataTransfer.files)
  }
}

if (drag) {
  events = {
    ...events,
    dragover: (e: DragEvent) => {
      handleDrag(e, true)
    },
    dragleave: (e: DragEvent) => {
      handleDrag(e, false)
    },
    drop: handleDrop,
  }
}

defineExpose({
  uploadFiles,
})
</script>

<style scoped>
.upload-list {
  margin: 0;
  padding: 0;
  list-style-type: none;
}
.upload-list li {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
  font-size: 14px;
  line-height: 1.8;
  margin-top: 5px;
  box-sizing: border-box;
  border-radius: 4px;
  min-width: 200px;
  position: relative;
  &:first-child {
    margin-top: 10px;
  }
  .upload-list-thumbnail {
    vertical-align: middle;
    display: inline-block;
    width: 70px;
    height: 70px;
    position: relative;
    z-index: 1;
    background-color: #fff;
    object-fit: cover;
  }
  .file-icon {
    svg {
      margin-right: 5px;
      color: rgba(0, 0, 0, 0.45);
    }
  }
  .filename {
    margin-left: 5px;
    margin-right: 40px;
  }
  &.upload-error {
    color: #f5222d;
    svg {
      color: #f5222d;
    }
  }
  .file-status {
    display: block;
    position: absolute;
    right: 5px;
    top: 0;
    line-height: inherit;
  }
  .delete-icon {
    display: none;
    position: absolute;
    right: 7px;
    top: 0;
    line-height: inherit;
    cursor: pointer;
  }
  &:hover {
    background-color: #efefef;
    .file-status {
      display: none;
    }
    .delete-icon {
      display: block;
    }
  }
}
</style>
