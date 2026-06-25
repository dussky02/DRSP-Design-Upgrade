/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_SKILLS, 
  INITIAL_PROFILES, 
  INITIAL_SESSIONS, 
  INITIAL_EVALUATIONS 
} from './src/initialData';
import { Firestore } from '@google-cloud/firestore';

const STATE_FILE_PATH = path.join(process.cwd(), 'state-db.json');

// Initialize Firestore
let firestore: Firestore | null = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId && config.firestoreDatabaseId) {
      firestore = new Firestore({
        projectId: config.projectId,
        databaseId: config.firestoreDatabaseId,
      });
      console.log(`Firestore initialized for project: ${config.projectId}, db: ${config.firestoreDatabaseId}`);
    }
  }
} catch (e) {
  console.error('Failed to initialize Firestore', e);
}

async function loadState() {
  // Try loading from Firestore first
  if (firestore) {
    try {
      const docRef = firestore.collection('app').doc('state');
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.categories && data.skills) {
          console.log('State loaded successfully from Firestore');
          return data;
        }
      } else {
        console.log('No state document found in Firestore. Creating initial state.');
        const defaultState = {
          categories: INITIAL_CATEGORIES,
          skills: INITIAL_SKILLS,
          profiles: INITIAL_PROFILES,
          sessions: INITIAL_SESSIONS,
          evaluations: INITIAL_EVALUATIONS
        };
        await docRef.set(defaultState);
        return defaultState;
      }
    } catch (e) {
      console.error('Error loading state from Firestore, falling back to local file', e);
    }
  }

  // Fallback to local file
  if (fs.existsSync(STATE_FILE_PATH)) {
    try {
      const dataStr = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(dataStr);
      if (parsed.categories && parsed.skills && parsed.profiles) {
        return parsed;
      }
    } catch (e) {
      console.error('Error reading state-db.json, using defaults', e);
    }
  }
  
  // Return default state
  return {
    categories: INITIAL_CATEGORIES,
    skills: INITIAL_SKILLS,
    profiles: INITIAL_PROFILES,
    sessions: INITIAL_SESSIONS,
    evaluations: INITIAL_EVALUATIONS
  };
}

async function saveState(state: any) {
  // Always save to local file as backup/local storage
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving state to state-db.json', e);
  }

  // Save to Firestore if available
  if (firestore) {
    try {
      const docRef = firestore.collection('app').doc('state');
      await docRef.set(state);
      console.log('State saved successfully to Firestore');
    } catch (e) {
      console.error('Error saving state to Firestore', e);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '50mb' }));

  // API router endpoints
  app.get('/api/state', async (req, res) => {
    const state = await loadState();
    res.json(state);
  });

  app.post('/api/state', async (req, res) => {
    const newState = req.body;
    if (newState && newState.categories && newState.skills) {
      await saveState(newState);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid state data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
