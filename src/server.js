import express from 'express';
import cors from 'cors';
// import pino from 'pino-http';
import helmet from 'helmet';
import 'dotenv/config';
import { connectMongoDB } from './db/connectMongoDB.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import notesRoutes from './routes/notesRoutes.js';
const PORT = process.env.PORT ?? 3000;

const app = express();
app.use(logger);
app.use(express.json());
app.use(cors());
app.use(helmet());

app.use((req, res, next) => {
  console.log(`Time: ${new Date().toLocaleString()}`);
  next();
});
// Перший маршрут
app.get('/', (req, res) => {
  res.status(200).json({ message: `Time: ${new Date().toLocaleString()}` });
});

app.use(notesRoutes); // <--- Основні маршрути (GET, POST, PATCH, DELETE)

app.use(notFoundHandler);

app.use(errorHandler);

await connectMongoDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
