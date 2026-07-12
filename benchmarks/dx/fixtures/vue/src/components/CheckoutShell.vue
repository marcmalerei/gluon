<script setup lang="ts">defineProps<{ title: string }>()</script>
<template><main class="shell"><h1 data-product-title>{{ title }}</h1><slot /></main></template>
