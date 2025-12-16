export function isObject(value: unknown) {
  return typeof value === 'object' && value !== null
}

export function isFunction(value: unknown) {
  return typeof value === 'function'
}

export function isString(value: unknown) {
  return typeof value === 'string'
}

export function isNumber(value: unknown) {
  return typeof value === 'number'
}

export function isBoolean(value: unknown) {
  return typeof value === 'boolean'
}

export function isArray(value: unknown) {
  return Array.isArray(value)
}

export const NOOP = () => {}
