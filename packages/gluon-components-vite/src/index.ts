import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
import type { TemplateResult } from '@gluonjs/core';
import type {
  AnnotatedStoryFn,
  Args,
  CompatibleString,
  ComponentAnnotations,
  DecoratorFunction,
  LoaderFunction,
  ProjectAnnotations,
  StoryAnnotations,
  StorybookConfig as StorybookConfigBase,
  StoryContext as StoryContextBase,
  StrictArgs,
  WebRenderer,
} from 'storybook/internal/types';

/** A Gluon function that Storybook can invoke as component metadata. */
export type GluonStoryComponent = (
  args: Args,
  context: StoryContextBase<GluonRenderer>,
) => TemplateResult;

/** Storybook's public renderer contract specialized for Gluon templates. */
export interface GluonRenderer extends WebRenderer {
  component: GluonStoryComponent;
  storyResult: TemplateResult;
}

/** Metadata for a Gluon component or story group. */
export type Meta<TArgs = Args> = ComponentAnnotations<GluonRenderer, TArgs>;

/** A CSF2 Gluon story function. */
export type StoryFn<TArgs = Args> = AnnotatedStoryFn<GluonRenderer, TArgs>;

/** A CSF3 Gluon story object. */
export type StoryObj<TArgs = Args> = StoryAnnotations<GluonRenderer, TArgs>;

/** A Gluon Storybook decorator. */
export type Decorator<TArgs = StrictArgs> = DecoratorFunction<GluonRenderer, TArgs>;

/** A Gluon Storybook loader. */
export type Loader<TArgs = StrictArgs> = LoaderFunction<GluonRenderer, TArgs>;

/** The typed context passed to a Gluon story. */
export type StoryContext<TArgs = StrictArgs> = StoryContextBase<GluonRenderer, TArgs>;

/** Project-wide preview annotations for Gluon stories. */
export type Preview = ProjectAnnotations<GluonRenderer>;

/** Options accepted by the Gluon Vite framework. */
export interface FrameworkOptions {
  builder?: BuilderOptions;
}

type FrameworkName = CompatibleString<'@gluonjs/gluon-components-vite'>;
type BuilderName = CompatibleString<'@storybook/builder-vite'>;
type StorybookConfigFramework = {
  framework: FrameworkName | {
    name: FrameworkName;
    options: FrameworkOptions;
  };
  core?: StorybookConfigBase['core'] & {
    builder?: BuilderName | {
      name: BuilderName;
      options: BuilderOptions;
    };
  };
};

/** Type-safe `main.ts` configuration for the Gluon Vite framework. */
export type StorybookConfig =
  Omit<StorybookConfigBase, keyof StorybookConfigVite | keyof StorybookConfigFramework>
  & StorybookConfigVite
  & StorybookConfigFramework;

export type {
  Args,
  StrictArgs,
} from 'storybook/internal/types';
