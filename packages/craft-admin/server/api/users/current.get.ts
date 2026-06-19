// 把原来的 defineEventHandler 换成 defineAuthResponseHandler 即可（server/utils/ 自动导入，无需 import）
export default defineAuthResponseHandler(async (event) => {
  const currentUser = await UserSchema.findOne({ username: event.context.user?.username }).exec()
  return currentUser?.toJSON()
})
