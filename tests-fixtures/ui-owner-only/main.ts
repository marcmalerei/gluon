import { installUi, type InstallUiOptions, type UiOwner } from '@gluonjs/atoms';
import type { StyleTarget } from '@gluonjs/core';

export function startUi(
  target: StyleTarget,
  options: InstallUiOptions = {},
): UiOwner {
  return installUi(target, options);
}
