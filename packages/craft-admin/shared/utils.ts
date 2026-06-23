export const getErrorMessage = (error: any) => {
  return error.data?.message
    ?? error.statusMessage
    ?? '请求失败，请稍后重试'
}
