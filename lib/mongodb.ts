import mongoose from 'mongoose';

// Define the connection cache type
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object to include our mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Get MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env file'
  );
}

/**
 * Global cache to store the mongoose connection.
 * This prevents creating multiple connections in development
 * when Next.js hot-reloads modules.
 */
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

/**
 * Establishes a connection to MongoDB using Mongoose.
 * Implements connection caching to reuse existing connections
 * and prevent connection pooling issues in serverless environments.
 * 
 * @returns Promise that resolves to the mongoose instance
 */
async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn;
  }

  // Create new connection if no promise exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering to fail fast in serverless
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    // Wait for the connection promise and cache the result
    cached.conn = await cached.promise;
  } catch (error) {
    // Clear the promise cache on error to allow retry
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
