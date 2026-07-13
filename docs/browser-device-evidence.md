# Browser and device evidence protocol

Engine automation and product support are separate evidence classes. The CI
matrix runs Playwright-managed Chromium, Firefox, and WebKit on every pull
request. A local verification on 2026-07-11 used Chromium 149.0.7827.55,
Firefox 151.0, and WebKit 26.5 on macOS 26.3.1 in headless mode. These exact
engine results do not establish support for branded Chrome, Edge, Firefox ESR,
Safari, iOS, or Android.

Gluon 1.0 deliberately stops at this engine-level evidence. Its release
compatibility manifest records the exact Playwright-managed Chromium, Firefox,
and WebKit binaries, the runner, and the successful Quality Gates run. It makes
no branded Chrome, Edge, Firefox, Safari, iOS, or Android support claim.

The following protocol is retained for a future release that chooses to add a
branded product support contract. Such a release must freeze the product windows
through a new accepted ADR amendment and commit one immutable manifest. Every
row would record:

- Gluon commit and package version;
- UTC cut and execution timestamps;
- browser product, channel, exact version, and engine version;
- operating system, exact version, device or simulator/emulator model;
- headless/headed, automation/manual, keyboard, and assistive-technology mode;
- capability-probe, conformance, GLUON GOODS E2E, accessibility, and screenshot
  artifact identifiers;
- pass, fail, or unsupported outcome with a linked issue for every failure.

Chrome/Edge/Firefox desktop rows would run the complete browser suite in the named
products where automation is available. Real Safari and the recorded iOS and
Android device/simulator rows would follow the manual keyboard and assistive-technology
protocol in [`accessibility.md`](accessibility.md). Engine-only substitutions
remain labeled as early evidence and never inherit a branded support claim.

The private `0.0.0` line and the first supported `1.0.5` release have no branded-product
support claim. Documentation may report only the exact engine, runner, and mode
that actually ran. This future protocol is not a Gluon 1.0 release gate.
