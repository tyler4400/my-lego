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
    <NuxtWelcome />
    <pre>{{ user }}</pre>
  </div>
</template>
