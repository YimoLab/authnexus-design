<script setup lang="ts">
/* 图片选择器（Vue 实现补充）：点击选择图片 → 中心裁剪为方形并压缩为 dataURL。
   用户头像（圆形）与应用图标（圆角方形）共用；组件只产出 dataURL，
   持久化（上传到后端换取 URL 等）由使用方自行接管。 */
import { ref } from 'vue'
import Icon from './Icon.vue'
import { toast } from '../overlay/toast'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    variant?: 'avatar' | 'icon'
    /** 输出边长（px，正方形） */
    size?: number
    hint?: string
  }>(),
  { modelValue: null, variant: 'avatar', size: 256 },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const inputEl = ref<HTMLInputElement | null>(null)
const busy = ref(false)

const MAX_FILE = 2 * 1024 * 1024
/* GIF 不做 canvas 处理（会丢动画），原样保存，因此上限更严 */
const MAX_GIF = 512 * 1024

function pick() {
  inputEl.value?.click()
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  /* 清空 value，保证连续选择同一文件也能触发 change */
  input.value = ''
  if (!file) return
  if (!/^image\//.test(file.type)) {
    toast({ tone: 'danger', title: '请选择图片文件', text: '支持 PNG / JPG / WebP / GIF。' })
    return
  }
  if (file.size > MAX_FILE) {
    toast({ tone: 'danger', title: '图片过大', text: '请选择 2MB 以内的图片。' })
    return
  }
  busy.value = true
  try {
    /* GIF 动图：canvas 只能取第一帧，会丢失动画——原样读取为 dataURL 直接保存 */
    if (file.type === 'image/gif') {
      if (file.size > MAX_GIF) {
        toast({
          tone: 'danger',
          title: 'GIF 动图过大',
          text: '动图请控制在 512KB 以内（PNG / JPG 等静态图上限 2MB）。',
        })
        return
      }
      emit('update:modelValue', await readAsDataURL(file))
      return
    }
    emit('update:modelValue', await compress(file, props.size))
  } catch {
    toast({ tone: 'danger', title: '图片处理失败', text: '请换一张图片重试。' })
  } finally {
    busy.value = false
  }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('file read failed'))
    reader.readAsDataURL(file)
  })
}

/** 中心裁剪为方形 + 缩放；webp 优先（体积小且保留透明），不支持时回退 png */
function compress(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas unavailable')
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        const webp = canvas.toDataURL('image/webp', 0.9)
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

function remove() {
  emit('update:modelValue', null)
}
</script>

<template>
  <div class="imgpick" :class="'imgpick--' + variant">
    <button
      type="button"
      class="imgpick__preview"
      :aria-label="modelValue ? '更换图片' : '上传图片'"
      @click="pick"
    >
      <img v-if="modelValue" :src="modelValue" alt="" />
      <span v-else class="imgpick__ph" :class="{ 'is-busy': busy }">
        <Icon :name="busy ? 'refresh' : 'image'" :size="20" />
      </span>
      <span v-if="modelValue" class="imgpick__mask">
        <Icon name="image" :size="18" />
      </span>
    </button>
    <div class="imgpick__meta">
      <div class="od-row" style="gap: 8px">
        <button type="button" class="btn btn--ghost btn--sm" @click="pick">
          {{ modelValue ? '更换图片' : '上传图片' }}
        </button>
        <button v-if="modelValue" type="button" class="btn btn--danger-quiet btn--sm" @click="remove">
          移除
        </button>
      </div>
      <p v-if="hint" class="t-xs t-faint imgpick__hint">{{ hint }}</p>
    </div>
    <input ref="inputEl" type="file" accept="image/*" class="imgpick__input" @change="onFile" />
  </div>
</template>
