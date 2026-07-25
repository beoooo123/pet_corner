import dns from 'dns';
import mongoose from 'mongoose';
import ENV_VARS from '../config/config.js';

const connectWithDnsServers = async (servers: string[]) => {
  const resolver = new dns.Resolver();
  resolver.setServers(servers);
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(servers);
  return mongoose.connect(ENV_VARS.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  } as mongoose.ConnectOptions);
};

export const connectDB = async () => {
  try {
    if (!ENV_VARS.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB đã được kết nối trước đó');
      return;
    }

    mongoose.set('strictQuery', false);

    if (!ENV_VARS.MONGODB_URI.startsWith('mongodb+srv://')) {
      const conn = await mongoose.connect(ENV_VARS.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      } as mongoose.ConnectOptions);
      console.log(`Kết nối thành công: ${conn.connection.host}`);
      return;
    }

    try {
      const conn = await mongoose.connect(ENV_VARS.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      } as mongoose.ConnectOptions);
      console.log(`Kết nối thành công (DNS mặc định): ${conn.connection.host}`);
      return;
    } catch (firstError) {
      console.warn('DNS mặc định không thể resolve SRV. Thử lại với DNS Google...');
      dns.setServers(['8.8.8.8', '8.8.4.4']);
      const conn = await mongoose.connect(ENV_VARS.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      } as mongoose.ConnectOptions);
      console.log(`Kết nối thành công (DNS Google): ${conn.connection.host}`);
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      console.error('Error connecting to MongoDB: Unknown error');
    }
    process.exit(1);
  }
};
