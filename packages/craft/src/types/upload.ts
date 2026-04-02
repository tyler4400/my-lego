/*
// 一个返回示例
{
  "code": 0,
  "data": {
    "__v": 0,
    "url": "http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69ce1217b558154f039349ab.jpg",
    "filename": "ded823c529dbe111bd881fbc8042a4eb.jpg",
    "extname": ".jpg",
    "_id": "69ce1217b558154f039349ab",
    "createdAt": "2026-04-02T06:52:07.879Z"
  },
  "msg": "请求成功"
}
* */
export interface UploadResponse {
  code: number
  data: {
    __v: number // 0
    url: string // string  //'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/694159dbb558154f039348f6.png'
    filename: string // 'bg.png'
    extname: string // '.png'
    _id: string // '694159dbb558154f039348f6'
    createdAt: string // '2025-12-16T13:08:43.845Z'
  }
  msg: string // '请求成功'

}
