export function findLockstepVersionMentions(text) {
  const versions = [];
  const releaseLine = /(?:lockstep\s+Gluon|current)\s+`(\d+\.\d+\.\d+)`\s+release line/gi;
  for (const match of text.matchAll(releaseLine)) versions.push(match[1]);
  return versions;
}

export function findContradictoryReleaseWording(text) {
  const findings = [];
  if (/(?:the\s+)?API remains experimental/i.test(text)) findings.push('experimental-release-state');
  if (/does not provide[^.\n]*(?:language tooling|Devtools)[^.\n]*public release/i.test(text)) findings.push('missing-shipped-surface');
  return findings;
}

export function validateDocsConsistency(entries, options) {
  const {
    currentVersion,
    releaseLinePaths = [],
    requiredPhrasesByPath = {},
  } = options;
  if (!/^\d+\.\d+\.\d+$/.test(currentVersion)) throw new Error(`invalid current documentation version: ${currentVersion}`);

  const entriesByPath = new Map(entries.map((entry) => [entry.path, entry]));
  for (const entry of entries) {
    const contradictions = findContradictoryReleaseWording(entry.text);
    if (contradictions.length > 0) {
      throw new Error(`${entry.path} contains contradictory release-state wording: ${contradictions.join(', ')}`);
    }
  }

  for (const path of releaseLinePaths) {
    const entry = entriesByPath.get(path);
    if (!entry) throw new Error(`missing release-line documentation source: ${path}`);
    const mentions = findLockstepVersionMentions(entry.text);
    if (mentions.length === 0) throw new Error(`${path} does not name its current release line`);
    const stale = mentions.filter((version) => version !== currentVersion);
    if (stale.length > 0) throw new Error(`${path} contains stale lockstep version mentions: ${[...new Set(stale)].join(', ')}`);
  }

  for (const [path, phrases] of Object.entries(requiredPhrasesByPath)) {
    const entry = entriesByPath.get(path);
    if (!entry) throw new Error(`missing documentation source required by consistency policy: ${path}`);
    for (const phrase of phrases) {
      if (!entry.text.includes(phrase)) throw new Error(`${path} is missing required consistency phrase: ${phrase}`);
    }
  }
}
