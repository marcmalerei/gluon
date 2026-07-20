import { createApp, h, ref } from 'vue';

createApp({ setup: () => {
  const count = ref(0);
  return () => h('main', [h('h1', 'Bundle fixture'), h('button', { type: 'button', 'aria-label': 'Increment', onClick: () => { count.value += 1; } }, 'Increment'), h('output', { 'aria-live': 'polite' }, String(count.value))]);
} }).mount('#app');
