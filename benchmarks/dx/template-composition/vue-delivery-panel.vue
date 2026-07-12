<script setup lang="ts">
defineProps<{ title: string }>();
defineEmits<{ submit: [event: Event] }>();
defineSlots<{ default(): unknown }>();
</script>

<template><form id="checkout" @submit="$emit('submit', $event)"><h2>{{ title }}</h2><slot /></form></template>
