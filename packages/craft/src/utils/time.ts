/** 把时间格式化为 HH:mm:ss（本地时间，贴合用户体感） */
export const formatClock = (date: Date) =>
  date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
