const fs = require('fs');
const path = require('path');

/**
 * Create a new capture session
 * @param {string} baseDir - Base directory for .crit folder
 * @returns {Object} Session info with paths
 */
function createSession(baseDir) {
  const critDir = path.join(baseDir, '.crit');
  const sessionsDir = path.join(critDir, 'sessions');

  // Create timestamp-based session name
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  const sessionName = timestamp;
  const sessionPath = path.join(sessionsDir, sessionName);
  const screenshotsDir = path.join(sessionPath, 'screenshots');

  // Create directories
  fs.mkdirSync(screenshotsDir, { recursive: true });

  // Write AGENTS.md for AI context
  writeAgentContext(critDir);

  return {
    name: sessionName,
    path: sessionPath,
    screenshotsDir,
    critDir
  };
}

/**
 * Write manifest to session directory
 * @param {string} sessionPath - Path to session directory
 * @param {Object} manifest - Manifest object
 */
function writeManifest(sessionPath, manifest) {
  const manifestPath = path.join(sessionPath, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

/**
 * Update the .crit/latest pointer
 * @param {string} critDir - Path to .crit directory
 * @param {string} sessionName - Session name to point to
 */
function updateLatestPointer(critDir, sessionName) {
  const latestPath = path.join(critDir, 'latest');
  fs.writeFileSync(latestPath, `sessions/${sessionName}`);
}

/**
 * Write AGENTS.md to the .crit directory for AI context
 */
function writeAgentContext(critDir) {
  const agentContextPath = path.join(critDir, 'AGENTS.md');
  const content = `# Crit UI Review Feedback

This directory contains UI review data captured from the iOS Simulator using Crit.

## Structure

- \`latest\` — points to the most recent session
- \`sessions/{timestamp}/manifest.json\` — lists all captured screenshots
- \`sessions/{timestamp}/screenshots/\` — raw simulator screenshots
- \`sessions/{timestamp}/feedback.json\` — exported review comments (created after export)
- \`sessions/{timestamp}/annotated/\` — screenshots with numbered pins overlaid
- \`sessions/{timestamp}/references/\` — reference images attached to comments

## How to read feedback.json

Each entry in \`captures\` represents a screenshot with feedback:

- \`image\` — the screenshot filename
- \`annotated\` — same screenshot with numbered pins showing comment locations
- \`pins\` — array of feedback items:
  - \`number\` — pin number matching the annotated screenshot
  - \`comment\` — what the reviewer wants changed
  - \`x, y\` — position on screen (percentage from top-left)
  - \`reference\` — optional image showing desired appearance

## Applying feedback

1. Read \`feedback.json\` from the latest session
2. Look at each \`annotated\` screenshot to see where pins are placed
3. Apply each pin's comment as a requested change
4. If a \`reference\` image is provided, match that visual
`;

  fs.writeFileSync(agentContextPath, content);
}

/**
 * Delete all existing session directories
 * @param {string} baseDir - Base directory for .crit folder
 */
function cleanSessions(baseDir) {
  const sessionsDir = path.join(baseDir, '.crit', 'sessions');
  if (!fs.existsSync(sessionsDir)) return;

  for (const name of fs.readdirSync(sessionsDir)) {
    const sessionPath = path.join(sessionsDir, name);
    if (fs.statSync(sessionPath).isDirectory()) {
      fs.rmSync(sessionPath, { recursive: true });
    }
  }
}

module.exports = {
  createSession,
  writeManifest,
  updateLatestPointer,
  cleanSessions
};
