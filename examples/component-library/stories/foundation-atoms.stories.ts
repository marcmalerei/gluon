import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import {
  createComponentStyleDependency,
  css,
  html,
} from '@gluonjs/core';
import {
  AspectRatio,
  Avatar,
  ScrollArea,
  Separator,
} from '@gluonjs/atoms';
import portrait from '../../../docs/assets/examples/foundation-avatar.svg?url&no-inline';

const storyStyles = css`
  #storybook-root {
    box-sizing: border-box;
    display: block;
    max-inline-size: 100%;
    color: #101010;
    font: 16px/1.5 system-ui, sans-serif;
  }

  .foundation-story {
    box-sizing: border-box;
    display: grid;
    gap: 1.5rem;
    inline-size: min(100%, 44rem);
    padding: 1.5rem;
    background: #fff;
  }

  .foundation-story h2,
  .foundation-story h3,
  .foundation-story p {
    margin: 0;
  }

  .foundation-story h3 {
    white-space: nowrap;
  }

  .foundation-story__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1rem;
  }

  .foundation-story__panel {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    min-inline-size: 0;
    padding: 1rem;
    border: 1px solid #d8d8d8;
  }

  .foundation-story__media img {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .foundation-story__avatars {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .foundation-story__scroll {
    --gluon-scroll-area-max-block-size: 7rem;
    --gluon-scroll-area-max-inline-size: 18rem;
    padding: 0.75rem;
    border: 1px solid #777;
  }

  .foundation-story__scroll-content {
    inline-size: 30rem;
    block-size: 14rem;
  }

  .foundation-story__separator-row {
    display: flex;
    block-size: 4rem;
    align-items: stretch;
    gap: 1rem;
  }
`;

const storyStyleDependency = createComponentStyleDependency({
  id: 'example-story-foundation-atoms',
  sheet: storyStyles,
  layer: 'organism',
  order: 101,
});

const meta = {
  title: 'Component library/Foundation atoms',
  render: () => html`
    <main class="foundation-story" data-foundation-atoms-story>
      <h2>Foundation atoms</h2>
      <div class="foundation-story__grid">
        <section class="foundation-story__panel">
          <h3>AspectRatio</h3>
          ${AspectRatio({
            ratio: 16 / 9,
            attributes: { class: 'foundation-story__media' },
            children: html`<img src=${portrait} alt="Abstract portrait illustration">`,
          })}
        </section>
        <section class="foundation-story__panel">
          <h3>Avatar lifecycle</h3>
          <div class="foundation-story__avatars">
            ${Avatar({ src: portrait, alt: 'Ada Lovelace', status: 'loaded' })}
            ${Avatar({ src: portrait, alt: 'Lin Chen', fallback: 'LC', status: 'loading' })}
            ${Avatar({ alt: 'Sam Rivera', fallback: 'SR', status: 'error' })}
          </div>
        </section>
        <section class="foundation-story__panel">
          <h3>Native ScrollArea</h3>
          ${ScrollArea({
            label: 'Release notes',
            orientation: 'both',
            attributes: {
              class: 'foundation-story__scroll',
              dir: 'rtl',
            },
            children: html`
              <div class="foundation-story__scroll-content">
                <p>Native overflow stays keyboard focusable.</p>
                <p>Long release notes remain inside a bounded region.</p>
                <p>Logical layout supports both text directions.</p>
                <p>Applications retain scroll-position ownership.</p>
              </div>
            `,
          })}
        </section>
        <section class="foundation-story__panel">
          <h3>Separator semantics</h3>
          ${Separator({})}
          <div class="foundation-story__separator-row">
            <span>Before</span>
            ${Separator({ orientation: 'vertical' })}
            <span>After</span>
          </div>
          ${Separator({ decorative: true })}
        </section>
      </div>
    </main>
  `.withStyleDependencies([storyStyleDependency]),
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Default: Story = {};
