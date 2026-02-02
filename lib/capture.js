const path = require('path');
const readline = require('readline');
const simulator = require('./simulator');
const session = require('./session');
const { ensureCritIgnored } = require('./gitignore');

/**
 * Capture screenshots from iOS Simulator
 * Simple: Enter = capture, q = quit
 * @param {Object} options - Capture options
 */
async function capture(options = {}) {
  const { baseDir = process.cwd() } = options;

  // Check simulator
  console.log('\nChecking simulator...');
  let booted = simulator.getBootedSimulator();

  if (!booted) {
    console.log('  No simulator running. Please boot a simulator and launch your app.');
    console.log('  Then run this command again.');
    process.exit(1);
  }

  console.log(`  Found: ${booted.name}`);
  const deviceInfo = simulator.getDeviceInfo();

  // Clean old sessions and create new one
  session.cleanSessions(baseDir);
  console.log('\nCreating session...');
  const sess = session.createSession(baseDir);
  console.log(`  Session: ${sess.name}`);
  ensureCritIgnored(baseDir);

  // Readline for input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (question) => new Promise(resolve => {
    rl.question(question, resolve);
  });

  const captures = [];
  let captureCount = 0;

  console.log('\n' + '='.repeat(40));
  console.log('  Enter = capture screenshot');
  console.log('  q     = quit');
  console.log('='.repeat(40) + '\n');

  try {
    while (true) {
      const input = (await prompt('Capture: ')).trim().toLowerCase();

      if (input === 'q' || input === 'quit') {
        break;
      }

      // Any other input (including empty Enter) = capture
      captureCount++;
      const filename = String(captureCount).padStart(3, '0') + '.png';
      const outputPath = path.join(sess.screenshotsDir, filename);

      try {
        simulator.screenshot(outputPath);
        console.log(`  [${captureCount}] ${filename}\n`);
        captures.push({ filename });
      } catch (error) {
        console.error(`  Error: ${error.message}\n`);
        captureCount--; // Don't count failed captures
      }
    }
  } finally {
    rl.close();
  }

  // Generate manifest
  if (captures.length > 0) {
    const manifest = {
      capturedAt: new Date().toISOString(),
      device: deviceInfo.name,
      captures: captures.map(c => ({
        image: `screenshots/${c.filename}`
      }))
    };

    const manifestPath = session.writeManifest(sess.path, manifest);
    console.log('\nGenerating manifest...');
    console.log(`  Written: ${manifestPath}`);

    session.updateLatestPointer(sess.critDir, sess.name);
    console.log('  Updated: .crit/latest');

    console.log('\n' + '='.repeat(40));
    console.log(`Captured ${captures.length} screenshot${captures.length !== 1 ? 's' : ''}`);
    console.log('='.repeat(40) + '\n');

    return { session: sess, captures, manifest };
  } else {
    console.log('\nNo screenshots captured.\n');
    return { session: sess, captures, manifest: null };
  }
}

module.exports = { capture };
