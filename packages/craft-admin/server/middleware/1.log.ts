export default defineEventHandler((event) => {
  // getRequestURL 是 H3 内置全局函数，取本次请求 URL
  console.log('new request', event.node.req.method, getRequestURL(event).href)
})
