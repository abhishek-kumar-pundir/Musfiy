import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import playlistRoutes from "./routes/playlistRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import transitionRoutes from "./routes/transitionRoutes.js";
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';





import { compressionMiddleware } from './middleware/compression.js';

dotenv.config();
const PORT = process.env.PORT || 6001;
const app  = express();
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL, ]
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile / postman
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS: " + origin), false);
  },
  credentials: true,
}));



app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compressionMiddleware);


// app.use("/uploads",cors(), express.static("uploads"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// app.use(
//   "/uploads",
//   cors(),
//   express.static(path.join(__dirname, "../uploads"))
// );
app.use("/api/playlist", playlistRoutes);
app.use("/api/stats", statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/transition', transitionRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server activated on port ${PORT}`);
  });
});
