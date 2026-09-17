import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// In-memory fallback store for previews or when external Firestore rules are offline
const memorySurprises = new Map();

// Rate limiting and user tracking (max 10 links per hour per user)
const userCreationHistory = new Map();

// Endpoint for client to read Firebase configuration
app.get('/api/firebase-config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    const { promises: fs } = await import('fs');
    try {
      const data = await fs.readFile(configPath, 'utf8');
      const parsed = JSON.parse(data);
      return res.json(parsed);
    } catch {
      // No firebase config file exists, Firebase is disconnected
      return res.json({});
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback in-memory storage endpoints with user isolation, 12hr expiration & 10 clicks limit cleanup
app.post('/api/surprises', (req, res) => {
  try {
    const now = Date.now();
    // Unique user identifier: from body, auth header, or client IP
    const userId = (req.body && req.body.creatorUid)
      || req.headers['x-user-id']
      || req.ip
      || 'anon_' + Math.random().toString(36).substring(2, 8);

    // Enforce 10 links per hour per user
    const oneHourAgo = now - (60 * 60 * 1000);
    const userTimestamps = (userCreationHistory.get(userId) || []).filter(t => t > oneHourAgo);

    if (userTimestamps.length >= 10) {
      return res.status(429).json({
        error: "Rate limit reached: Maximum 10 surprise links per hour per user. Please wait a little while before creating another."
      });
    }

    userTimestamps.push(now);
    userCreationHistory.set(userId, userTimestamps);

    const id = 'mem_' + Math.random().toString(36).substring(2, 10);
    const surpriseData = {
      ...req.body,
      id,
      creatorUid: userId,
      createdAt: req.body.createdAt || now,
      expiresAt: req.body.expiresAt || (now + 12 * 60 * 60 * 1000),
      maxClicks: typeof req.body.maxClicks === 'number' ? req.body.maxClicks : 10,
      clickCount: 0
    };
    memorySurprises.set(id, surpriseData);

    // Periodic cleanup of expired entries to avoid memory load
    for (const [key, item] of memorySurprises.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        memorySurprises.delete(key);
      }
    }

    res.json({ id, creatorUid: userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/surprises/:id', (req, res) => {
  const data = memorySurprises.get(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Surprise not found or has expired' });
  }

  const now = Date.now();
  if (data.expiresAt && now > data.expiresAt) {
    memorySurprises.delete(req.params.id);
    return res.status(410).json({ error: 'This surprise link has expired (12 hours limit reached).' });
  }

  // Increment click count
  data.clickCount = (data.clickCount || 0) + 1;
  const maxClicks = typeof data.maxClicks === 'number' ? data.maxClicks : 10;
  if (data.clickCount > maxClicks) {
    memorySurprises.delete(req.params.id);
    return res.status(410).json({ error: 'This surprise link has reached its maximum view limit (10 clicks) and was cleared.' });
  }

  res.json(data);
});

// Static assets
app.use(express.static(__dirname));

// Single Page fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
