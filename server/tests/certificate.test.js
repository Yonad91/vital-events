import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';

// Utility to clear DB collections
async function clearDatabase() {
	const collections = Object.keys(mongoose.connection.collections);
	for (const collectionName of collections) {
		await mongoose.connection.collections[collectionName].deleteMany({});
	}
}

describe('Certificate API security', () => {
	beforeEach(async () => {
		await clearDatabase();
	});

	afterEach(async () => {
		await clearDatabase();
	});

	it('should reject certificate request with expired token', async () => {
		// Use a hardcoded expired JWT (change secret as needed)
		const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJyb2xlIjoibWFuYWdlciIsImlhdCI6MTYwOTAwMDAwMCwiZXhwIjoxNjA5MDAwMDAwfQ.abc123';
		const res = await request(app)
			.patch('/users/manager/events/123/approve')
			.set('Authorization', expiredToken)
			.send();
		expect(res.status).toBe(401);
		expect(res.body.message).toMatch(/token/i);
	});

	it('should reject certificate request with invalid token', async () => {
		const res = await request(app)
			.patch('/users/manager/events/123/approve')
			.set('Authorization', 'Bearer invalidtoken')
			.send();
		expect(res.status).toBe(401);
		expect(res.body.message).toMatch(/token/i);
	});

	it('should reject unauthorized approve attempts', async () => {
		// No token at all
		const res = await request(app)
			.patch('/users/manager/events/123/approve')
			.send();
		expect(res.status).toBe(401);
		expect(res.body.message).toMatch(/unauthorized|token/i);
	});
});
