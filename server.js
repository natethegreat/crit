const http = require('http');
const fs = require('fs');
const path = require('path');
const simulator = require('./lib/simulator');
const session = require('./lib/session');

const PORT = process.env.PORT || 3847;
const PROJECT_DIR = process.env.CRIT_PROJECT_DIR || __dirname;
const REVIEW_DIR = path.join(PROJECT_DIR, '.crit');

function getLatestSession() {
  const latestPath = path.join(REVIEW_DIR, 'latest');
  if (fs.existsSync(latestPath)) {
    const relative = fs.readFileSync(latestPath, 'utf8').trim();
    return path.join(REVIEW_DIR, relative);
  }
  // Fallback: find most recent session
  const sessionsDir = path.join(REVIEW_DIR, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    const sessions = fs.readdirSync(sessionsDir).sort().reverse();
    if (sessions.length > 0) {
      return path.join(sessionsDir, sessions[0]);
    }
  }
  return null;
}

function getMimeType(ext) {
  const types = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };
  return types[ext] || 'application/octet-stream';
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const mimeType = getMimeType(ext);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        if (req.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(body.toString()));
        } else {
          resolve(body);
        }
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Serve the review UI
  if (pathname === '/' || pathname === '/index.html') {
    sendFile(res, path.join(__dirname, 'review-ui.html'));
    return;
  }

  // API routes
  if (pathname === '/api/manifest') {
    const sess = getLatestSession();
    if (!sess) {
      sendJson(res, { capturedAt: null, captures: [] });
      return;
    }
    const manifestPath = path.join(sess, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      sendJson(res, { capturedAt: null, captures: [] });
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    sendJson(res, manifest);
    return;
  }

  if (pathname === '/api/critique') {
    const session = getLatestSession();
    if (!session) {
      sendJson(res, { captures: {} });
      return;
    }
    const critiquePath = path.join(session, 'critique.json');
    if (!fs.existsSync(critiquePath)) {
      sendJson(res, { captures: {} });
      return;
    }
    const critique = JSON.parse(fs.readFileSync(critiquePath, 'utf8'));
    sendJson(res, critique);
    return;
  }

  if (pathname === '/api/sessions') {
    const sessionsDir = path.join(REVIEW_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      sendJson(res, []);
      return;
    }
    const sessions = fs.readdirSync(sessionsDir)
      .filter(d => fs.statSync(path.join(sessionsDir, d)).isDirectory())
      .sort()
      .reverse()
      .map(name => ({
        name,
        path: path.join(sessionsDir, name),
        timestamp: name
      }));
    sendJson(res, sessions);
    return;
  }

  if (pathname === '/api/feedback' && req.method === 'POST') {
    const session = getLatestSession();
    if (!session) {
      sendJson(res, { error: 'No session found' }, 404);
      return;
    }
    try {
      const body = await parseBody(req);
      const feedbackPath = path.join(session, 'feedback.json');
      fs.writeFileSync(feedbackPath, JSON.stringify(body, null, 2));
      sendJson(res, { success: true, path: feedbackPath });
    } catch (e) {
      sendJson(res, { error: e.message }, 500);
    }
    return;
  }

  if (pathname === '/api/annotated' && req.method === 'POST') {
    const session = getLatestSession();
    if (!session) {
      sendJson(res, { error: 'No session found' }, 404);
      return;
    }
    try {
      const body = await parseBody(req);
      const { filename, dataUrl } = body;
      const annotatedDir = path.join(session, 'annotated');
      if (!fs.existsSync(annotatedDir)) {
        fs.mkdirSync(annotatedDir, { recursive: true });
      }
      // Convert data URL to buffer
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(annotatedDir, filename);
      fs.writeFileSync(filePath, buffer);
      sendJson(res, { success: true, path: `annotated/${filename}` });
    } catch (e) {
      sendJson(res, { error: e.message }, 500);
    }
    return;
  }

  if (pathname === '/api/snap' && req.method === 'POST') {
    try {
      const booted = simulator.getBootedSimulator();
      if (!booted) {
        sendJson(res, { error: 'No simulator running' }, 400);
        return;
      }

      const deviceInfo = simulator.getDeviceInfo();
      let sess, manifest;
      const existingSession = getLatestSession();

      if (existingSession) {
        const manifestPath = path.join(existingSession, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          sess = {
            path: existingSession,
            screenshotsDir: path.join(existingSession, 'screenshots'),
            critDir: REVIEW_DIR,
            name: path.basename(existingSession)
          };
        }
      }

      if (!sess) {
        sess = session.createSession(PROJECT_DIR);
        manifest = {
          capturedAt: new Date().toISOString(),
          device: deviceInfo.name,
          captures: []
        };
      }

      const captureCount = manifest.captures.length + 1;
      const filename = String(captureCount).padStart(3, '0') + '.png';
      const outputPath = path.join(sess.screenshotsDir, filename);

      simulator.screenshot(outputPath);

      manifest.captures.push({ image: `screenshots/${filename}` });
      session.writeManifest(sess.path, manifest);
      session.updateLatestPointer(sess.critDir, sess.name);

      sendJson(res, { success: true, filename, total: manifest.captures.length });
    } catch (e) {
      sendJson(res, { error: e.message }, 500);
    }
    return;
  }

  if (pathname.startsWith('/api/references') && req.method === 'POST') {
    const session = getLatestSession();
    if (!session) {
      sendJson(res, { error: 'No session found' }, 404);
      return;
    }
    try {
      const body = await parseBody(req);
      const { filename, dataUrl } = body;
      const refsDir = path.join(session, 'references');
      if (!fs.existsSync(refsDir)) {
        fs.mkdirSync(refsDir, { recursive: true });
      }
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join(refsDir, filename);
      fs.writeFileSync(filePath, buffer);
      sendJson(res, { success: true, path: `references/${filename}` });
    } catch (e) {
      sendJson(res, { error: e.message }, 500);
    }
    return;
  }

  if (pathname.startsWith('/api/capture/') && req.method === 'DELETE') {
    const sess = getLatestSession();
    if (!sess) {
      sendJson(res, { error: 'No session found' }, 404);
      return;
    }
    const manifestPath = path.join(sess, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      sendJson(res, { error: 'No manifest found' }, 404);
      return;
    }
    try {
      const index = parseInt(pathname.split('/').pop(), 10);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (isNaN(index) || index < 0 || index >= manifest.captures.length) {
        sendJson(res, { error: 'Invalid capture index' }, 400);
        return;
      }
      const removed = manifest.captures.splice(index, 1)[0];
      session.writeManifest(sess, manifest);

      // Delete the screenshot file
      const imgPath = path.join(sess, removed.image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }

      sendJson(res, { success: true, removed: removed.image });
    } catch (e) {
      sendJson(res, { error: e.message }, 500);
    }
    return;
  }

  if (pathname === '/api/stop' && req.method === 'POST') {
    sendJson(res, { success: true });
    setTimeout(() => process.exit(0), 100);
    return;
  }

  // Serve files from current session
  if (pathname.startsWith('/screenshots/') ||
      pathname.startsWith('/annotated/') ||
      pathname.startsWith('/references/')) {
    const session = getLatestSession();
    if (!session) {
      res.writeHead(404);
      res.end('No session');
      return;
    }
    sendFile(res, path.join(session, pathname));
    return;
  }

  // 404 for everything else
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  Crit Review UI`);
  console.log(`  ==================`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Serving: ${REVIEW_DIR}\n`);
});
