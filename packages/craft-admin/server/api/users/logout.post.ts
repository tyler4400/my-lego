export default defineAuthResponseHandler((event) => {
  const config = useRuntimeConfig(event)
  deleteCookie(event, config.jwt.cookieName)
  return { success: true }
})
