---
layout: home
title: Gluon documentation
description: Build browser-native TypeScript applications with Gluon.
hero:
  name: Build web apps on the platform.
  text: Native Custom Elements. Clear ownership. Composable TypeScript packages.
  tagline: Start with a working app, add only the capabilities you need, and keep every boundary public and inspectable.
  actions:
    - theme: brand
      text: Start building
      link: /latest/guides/getting-started/
    - theme: alt
      text: Try the Playground
      link: /playground/
    - theme: alt
      text: See a real app
      link: https://github.com/marcmalerei/gluon/tree/main/examples/shop
features:
  - title: Learn by building
    details: Generate a working application first, then add components, state, routing, and deployment only when the product calls for them.
    link: /latest/guides/learning-path/
    linkText: Follow the learning path
  - title: Try before you commit
    details: Explore templates, diagnostics, and public APIs in the shareable browser Playground without setting up a repository.
    link: /playground/
    linkText: Open the Playground
  - title: Choose the right package
    details: Compare public boundaries, runtime requirements, dependencies, and examples across the complete package family.
    link: /latest/packages/
    linkText: Browse packages
  - title: Combine packages with intent
    details: Follow real recipes for application state, navigation, rendering, UI composition, and test ownership.
    link: /latest/cookbook/
    linkText: Read the recipes
  - title: Verify the exact contract
    details: Browse generated, version-matched references for every supported public package entry point.
    link: /latest/api/
    linkText: Browse the API
---

Gluon builds on the browser platform instead of hiding it. Its packages make
rendering, reactive state, application ownership, and native Custom Elements
compose without turning each capability into a private framework convention.

## A short path to a real application

1. **Generate a starter:** run `npm create gluon@latest my-app` and choose only
   the capabilities your application needs.
2. **Experiment in the browser:** use the [shareable Playground](/playground/)
   to test a template, inspect diagnostics, and send a reproduction link.
3. **Study a complete flow:** browse the [GLUON GOODS shop](https://github.com/marcmalerei/gluon/tree/main/examples/shop),
   the maintained application surface for routing, state, UI, SSR, and checkout.
4. **Give feedback:** [open an issue](https://github.com/marcmalerei/gluon/issues/new/choose)
   with the smallest reproduction or tell us which part of the first-run path
   was unclear.

## Find your path

| You want to… | Start here |
| --- | --- |
| Create a working project | [Getting started](/latest/guides/getting-started/) |
| Understand the model step by step | [Learning path](/latest/guides/learning-path/) |
| Pick a package | [Package guide](/latest/packages/) |
| Combine Router and Store | [Application architecture](/latest/guides/application/) |
| Render and hydrate on the server | [Universal rendering](/latest/guides/universal-rendering/) |
| Find an API contract | [API reference](/latest/api/) |
| Move from Vue | [Migration guides](/latest/migration/) |

The examples use official public package entry points. The living [GLUON GOODS
shop](https://github.com/marcmalerei/gluon/tree/main/examples/shop) remains the
application acceptance surface wherever a feature has a real customer flow.
