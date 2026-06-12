<script lang="ts" setup>
// import { isFunction } from '@my-lego/shared'
//
// console.log('isFunction', isFunction('123'))
//
// const user = useState('user', () => ({
//   name: 'admin',
//   age: 18,
// }
// ))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
