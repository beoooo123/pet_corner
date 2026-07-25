import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';
import dotenv from 'dotenv';
import ENV_VARS from './config/config.js';
import { connectDB } from './database/db.js';
import authRouter from './routes/auth.routes.js';
import categoryRouter from './routes/category.routes.js';
import productRouter from './routes/product.routes.js';
import userRouter from './routes/user.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import brandRouter from './routes/brand.routes.js';
import tagRouter from './routes/tag.routes.js';
import bannerRouter from './routes/banner.routes.js';

dotenv.config(); // Đọc file .env

const app = express();
const PORT = ENV_VARS.PORT;

const corsOptions = {
  origin: `${ENV_VARS.FE_URL}`,
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json()); // will allow us to parse req.body
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logger('dev'));

app.get('/', (req, res) => {
  res.send('Hello World1');
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', categoryRouter);
app.use('/api/v1', productRouter);
app.use('/api/v1', userRouter);
app.use('/api/v1', brandRouter);
app.use('/api/v1', tagRouter);
app.use('/api/v1', bannerRouter);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
  await connectDB();
});
