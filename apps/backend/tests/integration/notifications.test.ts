import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/app.js';
import { Notification } from '../../src/modules/notifications/notification.model.js';
import { auth } from '../../src/config/auth.js';

describe('Notifications API', () => {
  let mongoServer: MongoMemoryServer;
  const userId = 'usr_notification_123';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    vi.spyOn(auth.api, 'getSession').mockImplementation(async () => {
      return {
        session: { id: 'test-session', userId, expiresAt: new Date(Date.now() + 3600), createdAt: new Date(), updatedAt: new Date(), token: 'token' },
        user: { id: userId, email: 'test@pacelog.app', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      } as any;
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  it('should list empty notifications initially', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.unreadCount).toBe(0);
  });

  it('should list notifications and return correct unread count', async () => {
    await Notification.create({
      userId,
      type: 'streak_broken',
      title: 'Quebra de Ritmo',
      body: 'Você está há dias sem treinar.',
    });

    await Notification.create({
      userId,
      type: 'goal_achieved',
      title: 'Meta',
      body: 'Meta',
      readAt: new Date()
    });

    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.unreadCount).toBe(1);
  });

  it('should mark notifications as read', async () => {
    const notif = await Notification.create({
      userId,
      type: 'streak_broken',
      title: 'Quebra',
      body: 'Quebra',
    });

    const res = await request(app)
      .patch('/api/notifications/read')
      .send({ ids: [notif._id.toString()] });

    expect(res.status).toBe(200);

    const updated = await Notification.findById(notif._id);
    expect(updated?.readAt).not.toBeNull();
  });

  it('should delete a notification', async () => {
    const notif = await Notification.create({
      userId,
      type: 'streak_broken',
      title: 'Quebra',
      body: 'Quebra',
    });

    const res = await request(app).delete(`/api/notifications/${notif._id}`);
    expect(res.status).toBe(200);

    const exists = await Notification.findById(notif._id);
    expect(exists).toBeNull();
  });
});
