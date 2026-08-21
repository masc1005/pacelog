import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/backend/.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('insights').deleteMany({ type: 'session_analysis' });
  console.log('Deleted insights:', result.deletedCount);
  process.exit(0);
}
run();
