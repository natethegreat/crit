const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Ensure .crit/ is in .gitignore if this is a git repo.
 * Silent no-op if: not a git repo, already ignored, or git not installed.
 */
function ensureCritIgnored(baseDir) {
  try {
    execSync('git rev-parse --git-dir', { cwd: baseDir, stdio: 'pipe' });
  } catch {
    return; // Not a git repo or git not installed
  }

  try {
    execSync('git check-ignore -q .crit', { cwd: baseDir, stdio: 'pipe' });
    return; // Already ignored
  } catch {
    // Not ignored — fall through to add it
  }

  const gitignorePath = path.join(baseDir, '.gitignore');
  let prefix = '';

  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (content.length > 0 && !content.endsWith('\n')) {
      prefix = '\n';
    }
  }

  fs.appendFileSync(gitignorePath, prefix + '.crit/\n');
  console.log('  Added .crit/ to .gitignore');
}

module.exports = { ensureCritIgnored };
