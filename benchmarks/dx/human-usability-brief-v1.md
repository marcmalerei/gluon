# Human usability brief v1

This brief is the only task prompt for the human evidence required by issue
#107. Do not prefill findings, coach framework-specific steps, or convert an
automated run into a participant record.

## Participant protocol

1. Record a pseudonymous participant ID, relevant experience, date, operating
   system, Node/npm versions, and the randomized framework order.
2. Start each lane from its retained scaffold command and an empty working
   directory. The participant may use the official sources linked in
   `docs/dx-benchmark.md`, normal editor diagnostics, and package documentation.
3. Time and observe each task independently. Record where the participant first
   looked, commands attempted, errors encountered, recovery steps, and whether
   the diagnostic identified the failing file, contract, and repair.
4. Do not reveal another fixture's implementation until that lane is complete.
5. Retain raw notes. Report participant count, order effects, prior familiarity,
   facilitator interventions, unfinished tasks, and all other limitations.

## Written tasks

Build the same Evidence Tote checkout in Gluon, Vue, and React:

1. Scaffold a strict TypeScript application with two routes, shared persisted
   state, browser testing, and a production build.
2. Add a themed, accessible email input, purchase button, danger action, and
   accessible icon without copying library internals.
3. Add and extend one app-local primitive, repeated composition, and checkout
   layout.
4. Build a typed quantity form control with validation, a cancelable output
   event, focus exposure, named/default content, form participation, and cleanup.
5. Navigate product to checkout, persist and reload the exact line item, cover
   back/forward, and verify state retention through a compatible hot update.
6. Server-render and hydrate the same product route without replacing its DOM.
7. Use the quantity control from plain HTML without a framework host wrapper
   where the selected lane permits it; otherwise record the boundary.

Finally introduce the retained invalid prop, invalid event, and missing-cleanup
mistakes one at a time. Describe how discoverable and useful each diagnostic is.

## Completion boundary

A repository maintainer must review and add a real participant record that
conforms to `benchmarks/dx/schema/run-v1.schema.json`. This file is a protocol,
not evidence that a human pass occurred.
