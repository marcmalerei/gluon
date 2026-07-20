import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';

function Fixture() {
  const [count, setCount] = useState(0);
  return createElement('main', null, createElement('h1', null, 'Bundle fixture'), createElement('button', { type: 'button', 'aria-label': 'Increment', onClick: () => setCount(count + 1) }, 'Increment'), createElement('output', { 'aria-live': 'polite' }, count));
}
createRoot(document.querySelector('#app')!).render(createElement(Fixture));
