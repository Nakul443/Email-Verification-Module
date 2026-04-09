// main server file
// entry point

import app from './src/app.ts';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config(); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});