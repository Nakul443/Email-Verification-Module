// express app setup

import express from 'express';
import cors from 'cors';
import emailRoutes from './routes/emailRoutes.js';

const app = express();

// middleware
app.use(cors()); // allows frontend to talk to backend
app.use(express.json()); // allows the server to read JSON data from requests

// routes
app.use('/api', emailRoutes);

// health Check
app.get('/health', (req, res) => {
  res.json({ status: 'active', timestamp: new Date().toISOString() });
});

export default app;