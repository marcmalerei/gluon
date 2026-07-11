export const browserTargets = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserTarget = typeof browserTargets[number];

const requested = process.env.GLUON_BROWSER ?? 'chromium';

if (!browserTargets.includes(requested as BrowserTarget)) {
  throw new Error(`Unsupported GLUON_BROWSER ${requested}; expected ${browserTargets.join(', ')}.`);
}

export const browserTarget = requested as BrowserTarget;
