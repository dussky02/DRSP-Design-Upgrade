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

const STATE_FILE_PATH = path.join(process.cwd(), 'state-db.json');

function loadState() {
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

function saveState(state: any) {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving state to state-db.json', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '50mb' }));

  // API router endpoints
  app.get('/api/state', (req, res) => {
    const state = loadState();
    res.json(state);
  });

  app.post('/api/state', (req, res) => {
    const newState = req.body;
    if (newState && newState.categories && newState.skills) {
      saveState(newState);
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
