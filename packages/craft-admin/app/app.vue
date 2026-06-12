<script lang="ts" setup>
import { isFunction } from '@my-lego/shared'

console.log('isFunction', isFunction('123'))

const user = useState('user', () => ({
  name: 'admin',
  age: 18,
}
))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <div class="p-1 rounded bg-gray-400 text-center">
      首页
    </div>
    <pre>{{ user }}</pre>
  </div>
</template>
