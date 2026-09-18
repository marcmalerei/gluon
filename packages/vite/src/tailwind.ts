import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import gluon, { type GluonVitePluginOptions } from './index.js';

/**
 * Composes Tailwind's official Vite plugin with Gluon's universal stylesheet
 * manifest. This optional entry point keeps the base Vite plugin Tailwind-free.
 */
export function gluonTailwind(options: GluonVitePluginOptions = {}): Plugin[] {
  const universal = typeof options.universal === 'object'
    ? { ...options.universal, shadowStyles: options.universal.shadowStyles ?? true }
    : { shadowStyles: true };
  return [...tailwindcss(), gluon({ ...options, universal })];
}
