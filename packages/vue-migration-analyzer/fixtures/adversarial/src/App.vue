<script setup lang="ts">
import './execute-plugin.js';
defineProps<{ safe: boolean }>();
</script>
<template><main>{{ safe }}</main></template>
