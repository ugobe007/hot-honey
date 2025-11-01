import { MongoClient, Db, Collection, Document } from 'mongodb';

// MongoDB connection URI from environment variables
const uri = import.meta.env.VITE_MONGODB_URI;

if (!uri) {
  throw new Error('VITE_MONGODB_URI environment variable is not set');
}

// Global connection variables for connection pooling
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB with connection pooling
 * Reuses existing connection if available
 */
export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Create new MongoDB client
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
    });

    // Connect to MongoDB
    await client.connect();
    
    // Get database (uses default from connection string)
    const db = client.db();
    
    console.log('✅ Connected to MongoDB successfully');

    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw new Error(`Failed to connect to MongoDB: ${error}`);
  }
}

/**
 * Get a specific collection from the database
 */
export async function getCollection<T extends Document = Document>(collectionName: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  return db.collection<T>(collectionName);
}

/**
 * Close the MongoDB connection
 * Should be called when shutting down the app
 */
export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('🔌 MongoDB connection closed');
  }
}

// Collection names as constants
export const COLLECTIONS = {
  STARTUPS: 'startups',
  USERS: 'users',
  VOTES: 'votes',
  PENDING_UPLOADS: 'pending_uploads',
  VC_FIRMS: 'vc_firms',
  SYNDICATES: 'syndicates',
} as const;

// Type definitions for MongoDB documents
export interface StartupDocument {
  _id?: string;
  id: number;
  name: string;
  tagline: string;
  pitch: string;
  fivePoints: string[];
  website: string;
  funding: string;
  stage: number;
  industry: string;
  logo: string;
  votes: number;
  trending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoteDocument {
  _id?: string;
  userId: string;
  startupId: number;
  startupName: string;
  votedAt: Date;
  stage: number;
}

export interface PendingUploadDocument {
  _id?: string;
  name: string;
  tagline: string;
  pitch: string;
  fivePoints: string[];
  website?: string;
  funding?: string;
  stage?: number;
  industry?: string;
  uploadedAt: Date;
  uploadedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  source?: string;
}

export interface UserDocument {
  _id?: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  createdAt: Date;
  lastLogin: Date;
}

export default connectToDatabase;
