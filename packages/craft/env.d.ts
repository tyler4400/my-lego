/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 基础地址，例如 http://localhost:3001/api */
  readonly VITE_API_HOST: string
  /** 前端版本号，注入到请求头便于排查 */
  readonly VITE_APP_VERSION: string
  /** CSRF cookie 名，后端集成 CSRF 后填值即可启用 */
  readonly VITE_CSRF_COOKIE_NAME?: string
  /** CSRF header 名，后端集成 CSRF 后填值即可启用 */
  readonly VITE_CSRF_HEADER_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
