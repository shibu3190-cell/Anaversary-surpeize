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

// Endpoint for client to read Firebase configuration
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDtt-uO_iihx2PywqM328Wc5Lw-qsnRK-4",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "surprise-23c4a.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "surprise-23c4a",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "surprise-23c4a.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "140034132605",
    appId: process.env.FIREBASE_APP_ID || "1:140034132605:web:38ebe5f7dbbb694323bf14"
  });
});

// Fallback in-memory storage endpoints
app.post('/api/surprises', (req, res) => {
  try {
    const id = 'mem_' + Math.random().toString(36).substring(2, 10);
    memorySurprises.set(id, { ...req.body, id });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/surprises/:id', (req, res) => {
  const data = memorySurprises.get(req.params.id);
  if (!data) {
    return res.status(404).json({ error: 'Surprise not found' });
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
