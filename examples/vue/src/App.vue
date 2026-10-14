<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePager } from '../../../vue/lib/usePager'
import { toggleTheme } from '../../../vue/lib/theme'
import { toast } from '../../../vue/overlay/toast'
import { confirmDialog, openDrawer } from '../../../vue/overlay/manager'
import OverlayHost from '../../../vue/overlay/OverlayHost.vue'
import ToastHost from '../../../vue/overlay/ToastHost.vue'
import TablePager from '../../../vue/ui/TablePager.vue'
import SelectMenu from '../../../vue/ui/SelectMenu.vue'
import SegmentedControl from '../../../vue/ui/SegmentedControl.vue'
import UserAvatar from '../../../vue/ui/UserAvatar.vue'
import DemoDrawerContent from './DemoDrawerContent.vue'

/* ---------------- 示例数据（12 条，每页 5 条演示翻页滑动） ---------------- */

interface Row {
  id: string
  name: string
  owner: string
  calls: number
  status: 'ok' | 'warn'
}

const NAMES = ['云枢笔记', 'Figma', 'Notion', 'Linear', 'Raycast', 'Arc', 'Slack', 'Vercel', 'Supabase', 'Stripe', 'Twilio', 'Cloudflare']
const OWNERS = ['林知远', '何叙', '江余', '苏晚宁']

const all = ref<Row[]>(
  NAMES.map((name, i) => ({
    id: 'app_' + i,
    name,
    owner: OWNERS[i % OWNERS.length],
    calls: 1284 - i * 47,
    status: i % 5 === 3 ? 'warn' : 'ok',
  })),
)

/* ---------------- 分页（usePager + TablePager + 滑动过渡） ---------------- */

const pager = usePager(computed(() => all.value), 5)
const pageDir = computed(() => (pager.direction.value > 0 ? 'paged-fwd' : 'paged-back'))

/* ---------------- 下拉与分段 ---------------- */

const env = ref('prod')
const envOptions = [
  { value: 'prod', label: '生产环境' },
  { value: 'stage', label: '预发环境' },
  { value: 'dev', label: '开发环境' },
]

const view = ref('overview')
const viewOptions = [
  { value: 'overview', label: '概览' },
  { value: 'calls', label: '调用明细' },
]

/* ---------------- 浮层与通知 ---------------- */

function openDemoModal() {
  confirmDialog({
    title: '确认下架应用？',
    desc: '下架后回调地址将被立即停用，已授权的用户需要重新走授权流程。',
    tone: 'danger',
    confirmText: '确认下架',
    onConfirm: ({ close }) => {
      toast({ tone: 'ok', title: '已下架', text: '「云枢笔记」的回调地址已停用。' })
      close()
    },
  })
}

function openDemoDrawer() {
  openDrawer(DemoDrawerContent, { appName: '云枢笔记' })
}
</script>

<template>
  <div class="demo-wrap">
    <header class="demo-head">
      <h1 class="t-h2">AuthNexus Design · Vue 接线示例</h1>
      <div class="push demo-head-actions">
        <SegmentedControl v-model="view" :options="viewOptions" />
        <button class="btn btn--ghost btn--sm" type="button" @click="toast({ tone: 'info', title: '来自资产的 Toast' })">
          试一个 Toast
        </button>
        <button class="iconbtn" type="button" aria-label="切换主题" @click="toggleTheme({ origin: $event.currentTarget })">
          ◐
        </button>
      </div>
    </header>

    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>已接入应用</h2>
          <p>共 {{ pager.total.value }} 个</p>
        </div>
        <div class="panel__head-actions">
          <div style="width: 168px">
            <SelectMenu v-model="env" :options="envOptions" aria-label="环境筛选" />
          </div>
        </div>
      </div>

      <div class="panel__body panel__body--tight">
        <div class="paged-clip">
          <div class="table-wrap">
            <table class="table table--clickable">
              <thead>
                <tr>
                  <th>应用</th>
                  <th>归属</th>
                  <th class="is-num">调用数</th>
                  <th></th>
                </tr>
              </thead>
              <Transition :name="pageDir">
                <tbody :key="pager.page.value">
                  <tr v-for="row in pager.paged.value" :key="row.id">
                    <td>
                      <div class="cell-main">
                        <span class="appicon appicon--letter">{{ row.name.slice(0, 1) }}</span>
                        <div>
                          <div class="cell-title">{{ row.name }}</div>
                          <div class="cell-sub">
                            {{ row.id }}
                            <span v-if="row.status === 'warn'" class="badge badge--warn" style="margin-left: 8px">待审核</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="cell-main">
                        <UserAvatar :user="{ name: row.owner, id: row.id }" size="sm" />
                        <span>{{ row.owner }}</span>
                      </div>
                    </td>
                    <td class="is-num">{{ row.calls.toLocaleString() }}</td>
                    <td>
                      <div class="cell-actions">
                        <button class="btn btn--sm btn--ghost" type="button" @click="openDemoDrawer()">详情</button>
                        <button class="btn btn--sm btn--quiet" type="button" @click="openDemoModal()">下架</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </Transition>
            </table>
          </div>
        </div>
        <TablePager
          :total="pager.total.value"
          :page="pager.page.value"
          :page-size="pager.pageSize.value"
          :sizes="[5, 10, 20]"
          @update:page="pager.page.value = $event"
          @update:page-size="pager.pageSize.value = $event"
        />
      </div>
    </div>

    <p class="t-sm t-muted" style="margin-top: 24px">
      本示例直接引用仓库资产（../fonts、../css、../vue）。复制到新项目时，把这三处按 docs/ADOPT.md
      改成你项目内的路径即可；组件行为细节见 docs/BEHAVIOR.md。
    </p>
  </div>

  <!-- 浮层与通知的宿主（挂一次即可） -->
  <OverlayHost />
  <ToastHost />
</template>

<style>
/* 仅示例页面的布局样式（不覆盖资产 class） */
.demo-wrap { max-width: 1080px; margin: 0 auto; padding: 32px 24px 96px; }
.demo-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.demo-head .push { margin-left: auto; }
.demo-head-actions { display: flex; align-items: center; gap: 12px; }
</style>
