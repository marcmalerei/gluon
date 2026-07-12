<script setup lang="ts">
defineProps<{ heading: string }>();
defineSlots<{ default(): unknown; actions(): unknown; dialog(): unknown }>();
</script>

<template><main><h1>{{ heading }}</h1><slot /><slot name="actions" /><slot name="dialog" /></main></template>
