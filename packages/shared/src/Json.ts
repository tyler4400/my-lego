// 生成可直接注入到 <script> 的 JSON（避免 </script> 这类字符造成脚本提前闭合）
export const createSafeJson = (data: unknown) => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
