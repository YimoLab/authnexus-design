<script setup lang="ts">
import { inject } from 'vue'
import DrawerShell from '../../../vue/overlay/DrawerShell.vue'
import { OVERLAY_KEY } from '../../../vue/overlay/overlayState'

/* 通过 openDrawer(DemoDrawerContent, { appName: '…' }) 打开的内容组件：
   外壳（scrim + 抽屉 + 焦点管理）由 DrawerShell 负责，
   关闭时调用注入上下文的 close()（会播放 is-closing 收场动画）。 */

defineProps<{ appName?: string }>()

const overlay = inject(OVERLAY_KEY)!
</script>

<template>
  <DrawerShell title="应用详情" desc="openDrawer 的示例内容组件">
    <dl class="kv">
      <div class="kv__row"><dt>应用名称</dt><dd>{{ appName }}</dd></div>
      <div class="kv__row"><dt>应用 ID</dt><dd>app_yunshu</dd></div>
      <div class="kv__row"><dt>状态</dt><dd><span class="badge badge--ok">已上线</span></dd></div>
      <div class="kv__row"><dt>回调地址</dt><dd>https://note.example.com/oauth/cb</dd></div>
    </dl>
    <template #foot>
      <button class="btn btn--primary" type="button" @click="overlay.close()">完成</button>
    </template>
  </DrawerShell>
</template>
