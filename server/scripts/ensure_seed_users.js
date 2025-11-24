import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/eventsdb';

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO);
    console.log('Connected to Mongo for ensure_seed_users');

    const seeds = [
      { name: 'Admin User', email: 'admin@gmail.com', password: 'admin123', role: 'admin' },
      { name: 'Manager User', email: 'manager@gmail.com', password: 'manager123', role: 'manager' },
      { name: 'Registrar User', email: 'registrar@gmail.com', password: 'registrar123', role: 'registrar' },
      { name: 'Hospital User', email: 'hospital@gmail.com', password: 'hospital123', role: 'hospital' },
      { name: 'Church User', email: 'church@gmail.com', password: 'church123', role: 'church' },
      { name: 'Mosque User', email: 'mosque@gmail.com', password: 'mosque123', role: 'mosque' },
    ];

    for (const u of seeds) {
      const hashed = await bcrypt.hash(u.password, 10);
      const res = await User.updateOne(
        { email: u.email },
        { $set: { name: u.name, role: u.role, active: true }, $setOnInsert: { password: hashed } },
        { upsert: true }
      );
      if (res.upsertedCount && res.upsertedCount > 0) {
        console.log('Created user:', u.email);
      } else if (res.matchedCount && res.matchedCount > 0) {
        console.log('User already existed, updated non-destructively:', u.email);
      } else {
        console.log('User upsert result for', u.email, res);
      }
    }

    console.log('ensure_seed_users finished');
  } catch (err) {
    console.error('Error in ensure_seed_users:', err);
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers();
