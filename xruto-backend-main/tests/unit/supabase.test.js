'use strict';

describe('config/supabase singleton', () => {
  beforeEach(() => {
    // Clear the require cache before each test so we can control env vars
    jest.resetModules();
  });

  it('returns null when SUPABASE_URL is not set', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    const { getSupabase } = require('../../config/supabase');
    expect(getSupabase()).toBeNull();
  });

  it('returns null when only SUPABASE_URL is set', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_ANON_KEY;
    const { getSupabase } = require('../../config/supabase');
    expect(getSupabase()).toBeNull();
  });

  it('returns a client object when both vars are set', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'fake-anon-key';
    const { getSupabase } = require('../../config/supabase');
    const client = getSupabase();
    expect(client).not.toBeNull();
    expect(typeof client).toBe('object');
  });

  it('returns the same instance on repeated calls (singleton)', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'fake-anon-key';
    const { getSupabase } = require('../../config/supabase');
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
  });

  afterAll(() => {
    // Restore — let .env take over for integration tests
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    jest.resetModules();
  });
});
