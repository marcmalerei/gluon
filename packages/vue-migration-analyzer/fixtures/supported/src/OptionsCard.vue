<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'OptionsCard',
  props: { title: String },
  emits: ['close'],
  data: () => ({ open: true }),
  mounted() { this.$emit('close'); },
});
</script>

<template><section><slot />{{ title }}</section></template>

<style module>
.root { color: blue; }
</style>
