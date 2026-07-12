<script setup lang="ts">
import { ref, useAttrs } from 'vue'
defineOptions({ inheritAttrs: false })
defineProps<{ variant: 'purchase' | 'danger' }>()
const attributes = useAttrs()
const button = ref<HTMLButtonElement>()
defineExpose({ focus: () => button.value?.focus() })
</script>
<template><button ref="button" v-bind="attributes" :class="`button button--${variant}`" :data-variant="variant"><slot /></button></template>
