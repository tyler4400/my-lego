<template>
  <div class="homepage-container">
    <Layout :style="{ background: '#fff' }">
      <LayoutHeader class="header">
        <div class="page-title">
          <router-link to="/">
            i分享
          </router-link>
        </div>
      </LayoutHeader>
      <LayoutContent class="home-layout">
        <router-view />
      </LayoutContent>
    </Layout>
    <LayoutFooter>© IACG（iacg.com）版权所有 |</LayoutFooter>
  </div>
</template>

<script setup lang="ts">
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from 'ant-design-vue'
</script>

<style>
.page-title {
  color: #fff;
}
</style>
