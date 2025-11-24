import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/eventsdb';

const ensureUser = async () => {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to Mongo for ensure_user');

    const email = 'hospital@gmail.com';
    const name = 'Hospital User';
    const passwordPlain = 'hospital123';
    const role = 'hospital';

    const hashed = await bcrypt.hash(passwordPlain, 10);

    const res = await User.updateOne(
      { email },
      { $setOnInsert: { name, email, password: hashed, role, active: true } },
      { upsert: true }
    );

    if (res.upsertedCount && res.upsertedCount > 0) {
      console.log('User created:', email);
    } else {
      console.log('User already exists (left unchanged):', email);
    }
  } catch (err) {
    console.error('Error ensuring user:', err);
  } finally {
    await mongoose.disconnect();
  }
};

ensureUser();
