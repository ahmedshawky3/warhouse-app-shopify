import mongoose from 'mongoose';
import { appLogger } from '../utils/logger.js';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    appLogger.info('Using existing MongoDB connection');
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse-app';
    
    await mongoose.connect(MONGODB_URI);

    isConnected = true;
    appLogger.info('MongoDB connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });

    mongoose.connection.on('error', (err) => {
      appLogger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      appLogger.warn('MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    appLogger.error('MongoDB connection failed:', error);
    throw error;
  }
};

export default { connectDB };

