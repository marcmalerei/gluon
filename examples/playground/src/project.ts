export interface PlaygroundProject {
  readonly app: string;
  readonly styles: string;
}

export const defaultProject: PlaygroundProject = Object.freeze({
  app: `import { html } from '@gluonjs/core';

export function Counter(count: number, increment: () => void) {
  return html\`
    <div class="counter-card">
      <h1>Count \${count}</h1>
      <button @click=\${increment} type="button" aria-tap="Increment counter">Increment</button>
      <img>Preview</img>
    </div>
  \`;
}
`,
  styles: `import { css } from '@gluonjs/core';

export const counterStyles = css\`
  .counter-card { display: grid; gap: 24px; padding: 48px; border: 1px solid #b8b8b3; }
  button { min-height: 48px; background: #c8ff00; border: 1px solid #111; }
\`;
`,
});

export function encodePlaygroundProject(project: PlaygroundProject): string {
  const bytes = new TextEncoder().encode(JSON.stringify(project));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodePlaygroundProject(value: string): PlaygroundProject {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<PlaygroundProject>;
  if (typeof parsed.app !== 'string' || typeof parsed.styles !== 'string') throw new Error('GLUON_PLAYGROUND_PAYLOAD_INVALID');
  return Object.freeze({ app: parsed.app, styles: parsed.styles });
}

export function projectFromLocation(location: Pick<Location, 'hash'>): PlaygroundProject {
  const payload = new URLSearchParams(location.hash.replace(/^#/, '')).get('p');
  if (!payload) return defaultProject;
  try { return decodePlaygroundProject(payload); } catch { return defaultProject; }
}
