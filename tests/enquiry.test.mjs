import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnquiry } from '../src/enquiry.mjs';

function submission(fields = {}) {
  return new Request('https://rads.example/api/enquiry', {
    method: 'POST',
    headers: {
      Origin: 'https://rads.example',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      name: 'Ritika Tester', email: 'ritika@example.com', goal: 'Learn',
      style: 'Bollywood', phone: '', message: 'First class please', ...fields
    })
  });
}

test('saves a valid enquiry before reporting success', async () => {
  let saved;
  const env = { ENQUIRIES_DB: {
    prepare() { return { bind(...values) { saved = values; return { run: async () => ({ success: true }) }; } }; }
  } };
  const result = await handleEnquiry(submission(), env);
  assert.equal(result.status, 200);
  assert.equal(saved[2], 'Ritika Tester');
  assert.equal(saved[3], 'ritika@example.com');
  assert.equal(saved[5], 'Learn');
  assert.equal(saved[6], 'Bollywood');
});

test('rejects invalid details without writing', async () => {
  const result = await handleEnquiry(submission({ email: 'invalid' }), {});
  assert.equal(result.status, 400);
});

test('does not report success when storage is unavailable', async () => {
  const result = await handleEnquiry(submission(), {});
  assert.equal(result.status, 503);
});

test('ignores honeypot submissions without writing', async () => {
  const result = await handleEnquiry(submission({ 'bot-field': 'spam' }), {});
  assert.equal(result.status, 200);
});

test('rejects posts from another origin', async () => {
  const request = submission();
  request.headers.set('Origin', 'https://other.example');
  const result = await handleEnquiry(request, {});
  assert.equal(result.status, 403);
});
