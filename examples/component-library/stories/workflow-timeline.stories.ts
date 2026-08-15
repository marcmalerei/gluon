import type { Meta, StoryObj } from '@gluonjs/gluon-components-vite';
import { createComponentStyleDependency, css, html } from '@gluonjs/core';
import { WorkflowTimeline, workflowTimelineStyles, type WorkflowTimelineProps } from '@gluonjs/organisms';

const storyStyles = css`
  #storybook-root { color: #101010; font: 16px/1.5 system-ui, sans-serif; }
  .workflow-timeline-story { display: grid; gap: 1rem; max-inline-size: 60rem; padding: 1.5rem; background: #fff; }
  .workflow-timeline-story h2, .workflow-timeline-story p { margin: 0; }
  .workflow-timeline-story .long-label { max-inline-size: 18rem; }
`;
const storyStyleDependency = createComponentStyleDependency({ id: 'example-story-workflow-timeline', sheet: storyStyles, layer: 'organism', order: 101 });

const baseSteps = [
  { id: 'received', label: 'Received', status: 'completed' },
  { id: 'review', label: 'Review', status: 'current' },
  { id: 'approval', label: 'Approval', status: 'blocked' },
  { id: 'delivery', label: 'Delivery', status: 'pending' },
] as const;

const meta = {
  title: 'Component library/Workflow timeline',
  render: (args) => html`<section class="workflow-timeline-story" aria-labelledby="workflow-timeline-heading">
    <h2 id="workflow-timeline-heading">${args.heading}</h2>
    ${WorkflowTimeline(args.timeline)}
  </section>`.withStyleDependencies([storyStyleDependency, { id: 'gluon-organism-workflow-timeline', sheet: workflowTimelineStyles, layer: 'organism', order: 1 }]),
  args: {
    heading: 'Order workflow',
    timeline: {
      id: 'storybook-workflow',
      state: 'degraded',
      role: 'Operations',
      evidence: 'Import log 42',
      nextAction: html`<button type="button">Retry</button>`,
      steps: [
        { id: 'received', label: 'Received', status: 'completed', evidence: 'Receipt 42' },
        { id: 'review', label: 'Review', status: 'current', role: 'Reviewer', action: html`<button type="button">Open review</button>` },
        { id: 'approval', label: 'Approval', status: 'blocked' },
        { id: 'delivery', label: 'Delivery', status: 'pending' },
        { id: 'archive', label: 'Archived', status: 'skipped' },
      ],
    } satisfies WorkflowTimelineProps,
  },
  argTypes: { heading: { control: 'text' } },
} satisfies Meta<{ heading: string; timeline: WorkflowTimelineProps }>;

export default meta;
type Story = StoryObj<{ heading: string; timeline: WorkflowTimelineProps }>;
export const StatesAndResponsiveLayout: Story = {};
export const Loading: Story = { args: { heading: 'Loading', timeline: { id: 'loading-workflow', state: 'loading', messages: { loading: 'Workflow wird geladen' } } } };
export const Empty: Story = { args: { heading: 'Empty', timeline: { id: 'empty-workflow', state: 'empty', messages: { empty: 'Keine Schritte vorhanden' } } } };
export const Active: Story = { args: { heading: 'Active', timeline: { id: 'active-workflow', state: 'active', steps: baseSteps.filter((step) => step.status !== 'blocked') } } };
export const Blocked: Story = { args: { heading: 'Blocked', timeline: { id: 'blocked-workflow', state: 'blocked', steps: baseSteps.map((step) => ({ ...step, status: step.id === 'approval' ? 'blocked' : step.status })) } } };
export const Degraded: Story = { args: { heading: 'Degraded', timeline: { id: 'degraded-workflow', state: 'degraded', steps: baseSteps } } };
export const Complete: Story = { args: { heading: 'Complete', timeline: { id: 'complete-workflow', state: 'complete', steps: [{ id: 'done', label: 'Complete', status: 'completed' }] } } };
export const LongLabelsAtTwoHundredPercent: Story = { args: { heading: 'Long labels at 200%', timeline: { id: 'long-workflow', steps: [{ id: 'long', label: 'A deliberately long workflow stage label that must wrap without overflow', status: 'current', description: 'Supporting text remains readable when the browser text size is increased.' }] } } };
export const ReducedMotionAndForcedColors: Story = { args: { heading: 'Reduced motion and forced colors', timeline: { id: 'media-workflow', steps: baseSteps, attributes: { 'data-qa': 'forced-colors-reduced-motion' } } } };
