<script setup lang="ts">
/* ==========================================================================
   AuthNexus Design · 路由内容进出场
   切换路由时旧视图淡出、新视图轻浮入场（out-in 保证两者不重叠）。

   为什么动画套在一个普通 div 上、而不是直接套在视图组件上：
   控制台/管理后台的页面大多被 RoleGuard 包着，渲染结果是**多根节点**；
   <Transition> 无法对非单一根节点的组件做进出场——Vue 只会告警，且
   mode="out-in" 会卡在 leave，新页面永远不挂载（实测：整页空白）。
   套一层普通 div 后，动画永远作用在这个 div 上，内部什么根节点都不影响。

   key 用「末级路由记录的 path 模式」：同一路由只换参数（如 /dev/apps/:id）
   时 key 不变——不重挂载、不播动画，保持与原先一致的行为；换页面才播。
   首次加载不播动画（appear 默认关闭）；减少动效由全局媒体查询压缩。
   ========================================================================== */
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const viewKey = computed(() => {
  const last = route.matched[route.matched.length - 1]
  return (last && last.path) || route.fullPath
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition name="routefade" mode="out-in">
      <div :key="viewKey" class="routefade-view">
        <component :is="Component" />
      </div>
    </Transition>
  </RouterView>
</template>
