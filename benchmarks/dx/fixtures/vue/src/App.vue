<template>
  <RouterView />
</template>

<style>
:root { font-family: system-ui, sans-serif; color: #111; background: #fff; }
* { box-sizing: border-box; }
body { margin: 0; }
.shell { max-width: 52rem; margin: 0 auto; padding: 2rem; }
.field { display: grid; gap: .5rem; margin-block: 1rem; }
.actions { display: flex; gap: .75rem; align-items: center; }
.button { min-height: 44px; border: 2px solid #111; padding: .65rem 1rem; font: inherit; cursor: pointer; }
.button--purchase { background: #c7ff31; }
.button--danger { color: #fff; background: #b42318; }
input { min-height: 44px; padding: .6rem; font: inherit; border: 2px solid #555; }
:focus-visible { outline: 3px solid #1645d8; outline-offset: 3px; }
</style>
