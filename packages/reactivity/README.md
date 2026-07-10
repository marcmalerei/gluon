# `@gluonjs/reactivity`

DOM-free reactive state primitives for Gluon. The package is private and
unpublished while the Gluon 1.0 contracts are being implemented.

```ts
import { computed, effect, reactive, ref } from '@gluonjs/reactivity';

const count = ref(1);
const state = reactive({ multiplier: 2 });
const total = computed(() => count.value * state.multiplier);

effect(() => {
  console.log(total.value);
});

count.value = 2;
```

## API

- `ref`, `shallowRef`, `isRef`, and `unref`
- `reactive`, `shallowReactive`, `readonly`, and `shallowReadonly`
- `isReactive`, `isReadonly`, `isProxy`, and `toRaw`
- `effect`, `stop`, and development-only `onTrack`/`onTrigger` callbacks
- lazy, cached readonly and writable `computed` values

Deep reactive proxies support plain objects, arrays, `Map`, and `Set`. The
package source compiles with the ES2022 library and no DOM or Node ambient
types.

## License

[MIT](LICENSE) — Copyright © 2026 Marc Malerei.
