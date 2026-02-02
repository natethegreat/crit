const { execSync } = require('child_process');

/**
 * List all available simulators
 * @returns {Array} Array of simulator objects with udid, name, state, etc.
 */
function listSimulators() {
  try {
    const output = execSync('xcrun simctl list --json devices', {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });
    const data = JSON.parse(output);
    const devices = [];

    for (const [runtime, sims] of Object.entries(data.devices)) {
      for (const sim of sims) {
        devices.push({
          ...sim,
          runtime: runtime.replace('com.apple.CoreSimulator.SimRuntime.', '')
        });
      }
    }

    return devices;
  } catch (error) {
    throw new Error(`Failed to list simulators: ${error.message}`);
  }
}

/**
 * Find the currently booted simulator
 * @returns {Object|null} Booted simulator or null
 */
function getBootedSimulator() {
  const simulators = listSimulators();
  return simulators.find(sim => sim.state === 'Booted') || null;
}

/**
 * Take a screenshot of the booted simulator
 * @param {string} outputPath - Path to save screenshot
 */
function screenshot(outputPath) {
  try {
    execSync(`xcrun simctl io booted screenshot "${outputPath}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (error) {
    throw new Error(`Failed to take screenshot: ${error.message}`);
  }
}

/**
 * Get device info for the booted simulator
 * @returns {Object} Device info
 */
function getDeviceInfo() {
  const booted = getBootedSimulator();
  if (!booted) {
    throw new Error('No booted simulator found');
  }

  return {
    name: booted.name,
    udid: booted.udid,
    runtime: booted.runtime,
    state: booted.state
  };
}

module.exports = {
  listSimulators,
  getBootedSimulator,
  screenshot,
  getDeviceInfo
};
