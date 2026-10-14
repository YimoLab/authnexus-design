<script setup lang="ts">
import Icon from './Icon.vue'
import SelectMenu from './SelectMenu.vue'
import type { FieldOption } from './ui.types'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'number' | 'textarea' | 'select'
    id?: string
    name?: string
    required?: boolean
    placeholder?: string
    hint?: string
    error?: string
    mono?: boolean
    rows?: number
    options?: FieldOption[]
    autocomplete?: string
    spellcheck?: boolean
    disabled?: boolean
    inputmode?: 'text' | 'numeric' | 'email' | 'url'
    ariaLabel?: string
  }>(),
  { type: 'text', rows: 3, spellcheck: true, modelValue: '' },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const fieldId = props.id || 'f_' + Math.random().toString(36).slice(2, 9)

function onInput(e: Event) {
  emit(
    'update:modelValue',
    (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value,
  )
}
</script>

<template>
  <div class="od-field field">
    <label v-if="label" class="field__label" :for="fieldId"
      >{{ label }}<span v-if="required" class="req" aria-hidden="true">*</span></label
    >

    <textarea
      v-if="type === 'textarea'"
      class="textarea"
      :class="{ 'input--mono': mono }"
      :id="fieldId"
      :name="name || fieldId"
      :rows="rows"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :spellcheck="spellcheck"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="hint ? fieldId + '_hint' : undefined"
      @input="onInput"
    />

    <!-- 下拉不再用原生 <select>：原生弹出层由系统绘制，样式与动效无法匹配设计系统 -->
    <SelectMenu
      v-else-if="type === 'select'"
      :id="fieldId"
      :model-value="modelValue"
      :options="options || []"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <input
      v-else
      class="input"
      :class="{ 'input--mono': mono }"
      :id="fieldId"
      :name="name || fieldId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :spellcheck="spellcheck"
      :inputmode="inputmode"
      :aria-label="ariaLabel"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="hint ? fieldId + '_hint' : undefined"
      @input="onInput"
    />

    <p v-if="hint" class="field__hint" :id="fieldId + '_hint'"><slot name="hint">{{ hint }}</slot></p>
    <p v-if="error" class="field__error">
      <Icon name="alert-circle" :size="14" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
