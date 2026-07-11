# Browser and device evidence protocol

Engine automation and product support are separate evidence classes. The CI
matrix runs Playwright-managed Chromium, Firefox, and WebKit on every pull
request. A local verification on 2026-07-11 used Chromium 149.0.7827.55,
Firefox 151.0, and WebKit 26.5 on macOS 26.3.1 in headless mode. These exact
engine results do not establish support for branded Chrome, Edge, Firefox ESR,
Safari, iOS, or Android.

At the Gluon 1.0 release-candidate cut, freeze the product windows defined by
ADR 0001 and commit one immutable manifest. Every row records:

- Gluon commit and package version;
- UTC cut and execution timestamps;
- browser product, channel, exact version, and engine version;
- operating system, exact version, device or simulator/emulator model;
- headless/headed, automation/manual, keyboard, and assistive-technology mode;
- capability-probe, conformance, GLUON GOODS E2E, accessibility, and screenshot
  artifact identifiers;
- pass, fail, or unsupported outcome with a linked issue for every failure.

Chrome/Edge/Firefox desktop rows run the complete browser suite in the named
products where automation is available. Real Safari and the recorded iOS and
Android device/simulator rows follow the manual keyboard and assistive-technology
protocol in [`accessibility.md`](accessibility.md). Engine-only substitutions
remain labeled as early evidence and never inherit a branded support claim.

The private `0.0.0` line has no branded-product support claim. Until the frozen
manifest exists, documentation may report only the exact engine, OS, and mode
that actually ran.
