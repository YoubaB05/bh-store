// Local dev only: npm run dev → http://localhost:3000
import 'dotenv/config';
import app from './src/app.js';

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`BH Store API → http://localhost:${port}`));