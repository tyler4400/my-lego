// 生成可直接注入到 <script> 的 JSON（避免 </script> 这类字符造成脚本提前闭合）
export const createSafeJson = (data: unknown) => {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

/**
 * regex 工具：
 * - escapeRegExp：把用户输入转义成“安全的正则字面量”，避免意外的正则语义或 ReDoS 风险扩大
 * - buildContainsRegex：构建“包含匹配”的忽略大小写正则（用于模糊搜索）
 */

export const escapeRegExp = (input: string) => {
  return input.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
