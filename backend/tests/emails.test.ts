import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
// Import the object, not the wildcard *
import { smtpService } from '../src/services/smtpService.js';

describe('Email Verification API - Jest Suite', () => {
  
  // Create spies on the object properties
  const spyGetMxRecords = jest.spyOn(smtpService, 'getMxRecords');
  const spyCheckMailbox = jest.spyOn(smtpService, 'checkMailbox');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- syntax Validation Tests ---
  describe('Syntax Checks', () => {
    it('should pass valid email formats', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'test@example.com' });
      expect(res.body.subresult).not.toBe('invalid_syntax');
    });

    it('should reject missing @ symbol', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'testexample.com' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    it('should reject double dots in domain', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'test@example..com' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    it('should reject multiple @ symbols', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'test@@example.com' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    // Test #5: Space in email
    it('should reject emails containing spaces', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'test user@example.com' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    // Test #6: Leading dot in local part
    it('should reject emails starting with a dot', async () => {
      const res = await request(app).post('/api/verify').send({ email: '.test@example.com' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });
  });

  // --- smtp error codes and network tests ---
  describe('SMTP & DNS Logic', () => {
    it('should return invalid for 550 error (User not found)', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockResolvedValue({ 
        exists: false, subresult: 'mailbox_does_not_exist' 
      });

      const res = await request(app).post('/api/verify').send({ email: 'fake@example.com' });
      expect(res.body.result).toBe('invalid');
      expect(res.body.resultcode).toBe(6);
    });

    it('should return unknown for 450 error (Greylisted)', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockResolvedValue({ 
        exists: false, subresult: 'greylisted' 
      });

      const res = await request(app).post('/api/verify').send({ email: 'busy@example.com' });
      expect(res.body.result).toBe('unknown');
      expect(res.body.resultcode).toBe(3);
    });

    it('should return unknown for connection timeout', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockResolvedValue({ 
        exists: false, subresult: 'connection_error', error: 'ETIMEDOUT' 
      });

      const res = await request(app).post('/api/verify').send({ email: 'slow@example.com' });
      expect(res.body.result).toBe('unknown');
    });

    // Test #10: No MX Records found
    it('should return invalid if no MX records exist for domain', async () => {
      spyGetMxRecords.mockResolvedValue([]);
      const res = await request(app).post('/api/verify').send({ email: 'user@invalid-domain.com' });
      expect(res.body.result).toBe('invalid');
      expect(res.body.subresult).toBe('no_mx_records');
    });

    // Test #11: SMTP Internal Error
    it('should handle internal SMTP exceptions as unknown', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockRejectedValue(new Error('Internal SMTP Crash'));
      
      const res = await request(app).post('/api/verify').send({ email: 'error@example.com' });
      expect(res.body.result).toBe('unknown');
      expect(res.body.subresult).toBe('internal_error');
    });
  });

  // --- edge cases ---
  describe('Edge Cases', () => {
    it('should handle empty string', async () => {
      const res = await request(app).post('/api/verify').send({ email: '' });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    it('should handle null or undefined', async () => {
      const res = await request(app).post('/api/verify').send({});
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    it('should reject very long emails', async () => {
      const longEmail = 'a'.repeat(255) + '@example.com';
      const res = await request(app).post('/api/verify').send({ email: longEmail });
      expect(res.body.subresult).toBe('invalid_syntax');
    });

    it('should handle special characters in local part', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockResolvedValue({ exists: true, subresult: 'mailbox_exists' });
      
      const res = await request(app).post('/api/verify').send({ email: 'my.name+tag@example.com' });
      expect(res.body.result).toBe('valid');
    });

    // Test #16: Typo detection logic
    it('should suggest a correction for common typos (e.g., gmaill.com)', async () => {
      const res = await request(app).post('/api/verify').send({ email: 'test@gmaill.com' });
      expect(res.body.subresult).toBe('typo_detected');
      expect(res.body.didyoumean).toBe('test@gmail.com');
    });

    // Test #17: Numeric local part
    it('should allow purely numeric local parts', async () => {
      spyGetMxRecords.mockResolvedValue(['mx.example.com']);
      spyCheckMailbox.mockResolvedValue({ exists: true, subresult: 'mailbox_exists' });
      
      const res = await request(app).post('/api/verify').send({ email: '123456789@example.com' });
      expect(res.body.result).toBe('valid');
    });
  });
});