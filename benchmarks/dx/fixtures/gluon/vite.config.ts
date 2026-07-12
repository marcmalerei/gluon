import { defineConfig } from 'vite';
import gluon from '@gluonjs/vite';

export default defineConfig({
  plugins: [gluon({ universal: true })],
});
