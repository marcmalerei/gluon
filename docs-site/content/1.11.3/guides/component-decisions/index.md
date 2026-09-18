# Choose Atom, Molecule, Organism, or Custom Element

Component levels describe responsibility, not visual size. Start with the
smallest honest boundary and promote it only when reuse and ownership require
more.

## Decision tree

1. Is this only a native element or headless browser behavior?
   Use a Quark or `q.<tag>()`.
2. Is it one stateless, reusable presentational value or control?
   Use an Atom.
3. Does it combine a few related controls or values into one reusable task?
   Use a Molecule.
4. Does it arrange a reusable section or multi-part workflow?
   Use an Organism.
5. Does it need an independent host, connection lifecycle, form association,
   internal state, or a stable platform tag?
   Use `defineGluonElement()` or subclass `GluonElement`.
6. Is it meaningful only inside one product or brand?
   Keep it application-local even if it uses layer metadata.

`defineAtom()`, `defineMolecule()`, and `defineOrganism()` add immutable layer
and display-name metadata to stateless functions. They do not create DOM hosts,
state, lifecycle, registration, or accessibility semantics.

## Promotion rule for official packages

An implementation belongs in `@gluonjs/atoms`, `@gluonjs/molecules`, or
`@gluonjs/organisms` only when all of these are true:

- more than one application can use the same semantic contract;
- its accessibility behavior is stable and testable without product copy;
- its API does not depend on GLUON GOODS routes, product fields, analytics, or
  brand classes;
- it has package documentation, unit/browser evidence, and a real shop use;
- consumers can customize it through public props, native attributes, slots,
  or tokens without importing repository internals.

Reuse inside one application is not sufficient evidence for an official
package.

## Verified GLUON GOODS classification

| Surface | Current boundary | Why |
| --- | --- | --- |
| Button, Input, Icon, Label | Official Atoms | Cross-application native controls/values with stable accessibility contracts. |
| FormField, Card | Official Molecules | Reusable small compositions whose labels, errors, content, and actions have stable semantics. |
| AppShell | Official Organism | Reusable landmark composition independent of shop product data. |
| PurchaseAction | App-local Molecule | It combines shop price copy, bag icon, analytics class, and purchase intent. |
| CheckoutExperience | App-local Organism | It owns the GLUON GOODS checkout form and order workflow. |
| Product configurator | App-local Custom Element | It owns product variants, form association, internal state, and a stable shop-facing host. |
| Editorial Journal link | App-local Atom/SFC | It is a branded navigation detail, not a cross-application primitive. |

The shop should continue using official primitives inside real customer flows.
It should not become a component gallery, and branded domain compositions
should not be promoted merely to increase the official inventory.

## Compiled example

This example shows the same data moving through a reusable Atom, a task-level
Molecule, and a section-level Organism:

<<< ../../../../examples/component-decisions.ts

The example is intentionally stateless. If quantity, validity, focus, or form
ownership must survive independently of its parent render, move that stateful
boundary to a Custom Element rather than hiding lifecycle inside a functional
component.

## Props and events

- Props are inputs. Keep them readonly at the component boundary.
- Native or custom events are outputs. Do not mutate a parent-owned object to
  report a change.
- Keep accessible names, disabled state, validation, and required structure as
  explicit semantic props when the component owns them.
- Forward ordinary native customization through typed `attributes` or Quark
  props; do not add arbitrary string variants for application-specific CSS.

## Styles

Official components own constructable stylesheet dependencies with stable IDs
and layer order. Applications style their own classes and documented tokens.
Neither application code nor Storybook stories may depend on `.gluon-*`
implementation classes.

## When not to create a component

Keep plain template markup when the fragment is short, used once, owns no
semantic contract, and becomes clearer when read in place. A wrapper with only
a new name is not automatically a useful abstraction.
