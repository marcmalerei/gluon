import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-node/json-forms.spec.ts'],
  },
});
