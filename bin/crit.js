#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' && args[i + 1]) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }
  return options;
}

function showHelp() {
  console.log(`
Crit - Visual QA for iOS apps

Usage:
  crit capture    Capture screenshots (Enter=capture, q=quit)
  crit serve      Review and annotate in browser

Options:
  --port <number>    Server port (default: 3847)
  --help             Show this help

Workflow:
  1. Boot your app in iOS Simulator
  2. crit capture
  3. Navigate to screens, press Enter to capture
  4. crit serve — opens browser for review
  5. Click to add pins, type comments, Export
  6. Share feedback.json with your coding agent

Note:
  Always capture before serving. Running capture while
  serve is open requires a page reload.
`);
}

async function runCapture() {
  const { capture } = require('../lib/capture');

  try {
    await capture({ baseDir: process.cwd() });
    console.log('Run "crit serve" to review the captured screenshots.\n');
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

function runServe(options) {
  const port = options.port || 3847;

  // Get the path to server.js relative to this script
  const serverPath = path.join(__dirname, '..', 'server.js');

  if (!fs.existsSync(serverPath)) {
    console.error(`Error: Server file not found: ${serverPath}`);
    process.exit(1);
  }

  // Check if there are any sessions to serve
  const critDir = path.join(process.cwd(), '.crit');
  const sessionsDir = path.join(critDir, 'sessions');

  if (!fs.existsSync(sessionsDir) || fs.readdirSync(sessionsDir).length === 0) {
    console.log('\nNo capture sessions found.');
    console.log('Run "crit capture" first to capture screenshots.\n');
    process.exit(1);
  }

  // Start the server
  const { spawn } = require('child_process');
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port, CRIT_PROJECT_DIR: process.cwd() }
  });

  server.on('error', (error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });

  // Open browser after a short delay
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    const { exec } = require('child_process');

    // macOS
    exec(`open "${url}"`, (error) => {
      if (error) {
        // Fallback for other platforms or if open fails
        console.log(`Open in browser: ${url}`);
      }
    });
  }, 500);
}

// Main execution
const options = parseOptions(args.slice(1));

if (options.help || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

switch (command) {
  case 'capture':
    runCapture();
    break;

  case 'serve':
    runServe(options);
    break;

  default:
    if (command) {
      console.error(`Unknown command: ${command}`);
    }
    showHelp();
    process.exit(command ? 1 : 0);
}
