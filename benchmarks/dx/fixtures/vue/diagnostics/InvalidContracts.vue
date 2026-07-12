<script setup lang="ts">import QuantityControl from '../src/components/QuantityControl.vue'; const product = { sku: 'GL-107', name: 'Evidence Tote', unitPrice: 24 }</script>
<template><QuantityControl product="wrong" @quantity-change="(value: string) => value.length" /><QuantityControl :product="product" @quantity-change="(value: string) => value.length" /></template>
