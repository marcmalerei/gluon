<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';

const props = defineProps<{ product: string; selected?: boolean }>();
const emit = defineEmits<{ (event: 'select', id: string): void }>();
const model = defineModel<string>('quantity');
const route = useRoute();
const store = defineStore('bag', () => ({ count: ref(0) }));
const label = computed(() => `${props.product}:${route.path}:${model.value}`);
const Details = defineAsyncComponent(() => import('./details.js'));
onMounted(() => emit('select', props.product));
void store;
</script>

<template>
  <article v-if="selected" ref="card">
    <slot name="title" />
    <input v-model="model" :aria-label="label">
    <Suspense><Details /></Suspense>
  </article>
</template>

<style scoped>
article { display: grid; }
</style>
