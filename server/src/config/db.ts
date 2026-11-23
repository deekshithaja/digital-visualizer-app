import mongoose, { Model } from 'mongoose';

export const TARGET_DB_NAME = 'digital_footprint_visualizer';

export function generateObjectId(): string {
  return new mongoose.Types.ObjectId().toHexString();
}

let lastConnectionError: string | null = null;
let pendingConnect: Promise<{ connected: boolean; error?: string }> | null = null;

mongoose.connection.on('connected', () => {
  lastConnectionError = null;
});

mongoose.connection.on('error', (err) => {
  lastConnectionError = err instanceof Error ? err.message : String(err);
});

mongoose.connection.on('disconnected', () => {
  if (!lastConnectionError) {
    lastConnectionError = 'Disconnected from MongoDB Atlas.';
  }
});

export async function connectDatabase(): Promise<{ mode: 'mongodb'; dbName: string }> {
  const uri = process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim();
  if (!uri) {
    lastConnectionError =
      'MONGODB_URI (or MONGO_URI) environment variable is missing. Cannot connect to MongoDB Atlas.';
    throw new Error(lastConnectionError);
  }

  mongoose.set('strictQuery', true);

  if (mongoose.connection.readyState !== 0 && mongoose.connection.readyState !== 1) {
    await mongoose.disconnect().catch(() => undefined);
  }

  try {
    await mongoose.connect(uri, {
      dbName: TARGET_DB_NAME,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      family: 4,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    lastConnectionError = message;
    console.error(`[DB] Failed to connect to MongoDB Atlas (${TARGET_DB_NAME}):`, message);
    throw err;
  }

  const connectedDb = mongoose.connection.name;
  if (connectedDb !== TARGET_DB_NAME) {
    await mongoose.disconnect();
    lastConnectionError = `Connected to unexpected database "${connectedDb}" instead of "${TARGET_DB_NAME}".`;
    throw new Error(lastConnectionError);
  }

  lastConnectionError = null;
  console.log(`[DB] Connected to MongoDB Atlas database "${connectedDb}"`);
  return { mode: 'mongodb', dbName: connectedDb };
}

export async function ensureDatabaseConnected(): Promise<{ connected: boolean; error?: string }> {
  if (isMongoConnected()) {
    return { connected: true };
  }
  if (!pendingConnect) {
    pendingConnect = (async () => {
      try {
        await connectDatabase();
        return { connected: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { connected: false, error };
      } finally {
        pendingConnect = null;
      }
    })();
  }
  return pendingConnect;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getConnectedDatabaseName(): string {
  return mongoose.connection.name || TARGET_DB_NAME;
}

export function getDatabaseError(): string | null {
  return lastConnectionError;
}

function normalizeDoc<T>(doc: any): T {
  if (!doc) return doc;
  const normalized: Record<string, any> = { ...doc, _id: String(doc._id) };
  if (normalized.createdAt instanceof Date) {
    normalized.createdAt = normalized.createdAt.toISOString();
  }
  if (normalized.updatedAt instanceof Date) {
    normalized.updatedAt = normalized.updatedAt.toISOString();
  }
  return normalized as T;
}

export interface FindOptions {
  sort?: Record<string, 1 | -1>;
  limit?: number;
}

export class CollectionAdapter<T extends Record<string, any>> {
  constructor(
    public readonly collectionName: string,
    private readonly mongooseModel: Model<any>
  ) {}

  private ensureConnected(): void {
    if (!isMongoConnected()) {
      throw new Error('MongoDB connection is not active.');
    }
  }

  async find(filter: Record<string, any> = {}, options: FindOptions = {}): Promise<T[]> {
    this.ensureConnected();
    let q = this.mongooseModel.find(filter);
    if (options.sort) q = q.sort(options.sort);
    if (options.limit && options.limit > 0) q = q.limit(options.limit);
    const res = await q.lean();
    return res.map((d: any) => normalizeDoc<T>(d));
  }

  async findOne(filter: Record<string, any>): Promise<T | null> {
    this.ensureConnected();
    const res = await this.mongooseModel.findOne(filter).lean();
    return res ? normalizeDoc<T>(res) : null;
  }

  async findById(id: string): Promise<T | null> {
    this.ensureConnected();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const res = await this.mongooseModel.findById(id).lean();
    return res ? normalizeDoc<T>(res) : null;
  }

  async create(data: Omit<T, '_id' | 'createdAt' | 'updatedAt'> & Partial<T>): Promise<T> {
    this.ensureConnected();
    const created = await this.mongooseModel.create(data);
    return normalizeDoc<T>(created.toObject());
  }

  async insertMany(
    items: Array<Omit<T, '_id' | 'createdAt' | 'updatedAt'> & Partial<T>>
  ): Promise<T[]> {
    this.ensureConnected();
    if (items.length === 0) return [];
    const created = await this.mongooseModel.insertMany(items);
    return created.map((c: any) => normalizeDoc<T>(c.toObject()));
  }

  async findByIdAndUpdate(id: string, update: Record<string, any>): Promise<T | null> {
    this.ensureConnected();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const res = await this.mongooseModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .lean();
    return res ? normalizeDoc<T>(res) : null;
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>): Promise<number> {
    this.ensureConnected();
    const res = await this.mongooseModel.updateMany(filter, update);
    return res.modifiedCount ?? 0;
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    this.ensureConnected();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const res = await this.mongooseModel.findByIdAndDelete(id).lean();
    return res ? normalizeDoc<T>(res) : null;
  }

  async deleteMany(filter: Record<string, any>): Promise<number> {
    this.ensureConnected();
    const res = await this.mongooseModel.deleteMany(filter);
    return res.deletedCount ?? 0;
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    this.ensureConnected();
    return this.mongooseModel.countDocuments(filter);
  }
}
