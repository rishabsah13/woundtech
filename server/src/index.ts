import { createApp } from './app.js';
import { createDb } from './db/connection.js';

const port = Number(process.env.PORT ?? 3001);
createApp(createDb()).listen(port, () => console.log(`API on http://localhost:${port}`));