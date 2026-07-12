# Template composition comparison evidence

Captured 2026-07-12 on Node 22.22.0, npm 10.9.4, TypeScript 5.7.x,
React 19.2.7 with `@types/react` 19.2.17, Vue 3.5.39, and vue-tsc 3.3.7.
The selected React comparator follows the official React JSX and props/children
guides; the Vue comparator follows the official component and slot guides:

- <https://react.dev/learn/writing-markup-with-jsx>
- <https://react.dev/learn/passing-props-to-a-component>
- <https://vuejs.org/guide/essentials/component-basics.html>
- <https://vuejs.org/guide/components/slots.html>

## Retained measurements

`evidence.json` is the machine-reviewed source. A token is one TypeScript
scanner token for `.ts`/`.tsx`, or one identifier, number, or non-whitespace
punctuation token for the SFC. Lines exclude blank lines. Maximum indentation
is the largest leading-space count. Call-site children count includes only
object-literal `children` property assignments.

| Fixture | Non-empty lines | Tokens | Max indentation | Call-site `children:` |
| --- | ---: | ---: | ---: | ---: |
| Gluon current calls | 28 | 202 | 4 | 2 |
| Gluon `compose()` | 28 | 213 | 4 | 0 |
| React JSX | 29 | 250 | 6 | 0 |
| Vue template | 16 | 192 | 6 | 0 |

The chosen Gluon fixture removes two call-site `children:` properties. It has
the same line count, eleven more scanner tokens, and the same measured maximum
indentation as the current Gluon fixture. These measurements do not prove that
one syntax is more readable.

## Diagnostics and edit task

The retained type fixture checks missing `title`, an invalid callback, an
unknown prop, and body content passed to a component without a children prop.
`tsc` consumes each `@ts-expect-error`; an unused directive would fail the gate.
The language-server fixture checks native ARIA and void-element mistakes at the
original line inside `compose()`. Compiler tests map an expression back to the
original author file. React and Vue comparator sources are valid under their
retained typecheck commands; this slice makes no cross-framework diagnostic
quality ranking.

The common edit task is to insert a phone input after the retained email input.
In every fixture the insertion point is the visible nested body; no component
definition, runtime registration, or build configuration changes. The Gluon
path adds the line inside the `compose()` body without adding `children:`.

## User-test finding

No human usability pass was run for issue #111 (zero participants). There is no
discoverability or preference result and no readability claim. Parent issue
#107 still owns the required retained human pass before any general DX
superiority conclusion.

## Reproduction

```sh
npm ci
npm run check:template-composition
npm run typecheck:core-api
npm run test:browser -- --run tests/components-and-utilities.spec.ts
npm run test:ssr -- --run tests-node/ssr.spec.ts
npm run test:vite -- --run tests-node/compiler-vite.spec.ts
npm run test:language-server -- --run tests-node/language-server.spec.ts
```
