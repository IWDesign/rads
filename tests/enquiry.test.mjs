import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEnquiry } from '../src/enquiry.mjs';
import { sendLeadEmail } from '../src/lead-email.mjs';

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
  let notified;
  const env = { ENQUIRIES_DB: {
    prepare() { return { bind(...values) { saved = values; return { run: async () => ({ success: true }) }; } }; }
  } };
  const result = await handleEnquiry(submission(), env, async (lead) => { notified = lead; });
  assert.equal(result.status, 200);
  assert.equal(saved[2], 'Ritika Tester');
  assert.equal(saved[3], 'ritika@example.com');
  assert.equal(saved[5], 'Learn');
  assert.equal(saved[6], 'Bollywood');
  assert.equal(notified.id, saved[0]);
  assert.equal(notified.email, saved[3]);
});

test('sends the saved lead through Resend with Reply-To and idempotency', async () => {
  let request;
  const lead = {
    id: 'lead-123', createdAt: '2026-11-21T12:00:00.000Z', name: 'Ritika Tester',
    email: 'ritika@example.com', phone: '123', goal: 'Learn', style: 'Bollywood',
    message: 'First class please'
  };
  await sendLeadEmail(lead, {
    RESEND_API_KEY: 'test-key', LEAD_EMAIL_FROM: 'RADS <leads@nrityaritika.com>',
    LEAD_EMAIL_TO: 'Aroraritika0406@gmail.com'
  }, async (url, options) => {
    request = { url, options };
    return { ok: true };
  });
  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers['Idempotency-Key'], 'rads-enquiry/lead-123');
  const email = JSON.parse(request.options.body);
  assert.deepEqual(email.to, ['Aroraritika0406@gmail.com']);
  assert.equal(email.reply_to, 'ritika@example.com');
  assert.match(email.text, /First class please/);
});

test('keeps the saved enquiry successful when Resend is unavailable', async () => {
  let saved = false;
  const env = { ENQUIRIES_DB: {
    prepare() { return { bind() { return { run: async () => { saved = true; return { success: true }; } }; } }; }
  } };
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await handleEnquiry(submission(), env, async () => { throw new Error('Resend unavailable'); });
    assert.equal(result.status, 200);
    assert.equal(saved, true);
  } finally {
    console.error = originalError;
  }
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

test('rejects link spam without writing or emailing', async () => {
  let touched = false;
  const env = { ENQUIRIES_DB: { prepare() { touched = true; throw new Error('should not write'); } } };
  const samples = [
    { message: 'Read the news and earn $50,000,000 per month special $>$>$>$> https://tau.lu/f3b342394' },
    { message: 'earn now https://myip.kr/ZxBnL' },
    { message: 'visit tau.lu/f3b342394 today' },
    { message: 'go to www.example-offers' },
    { name: 'Buy at cheap-deals.xyz' }
  ];
  for (const fields of samples) {
    const result = await handleEnquiry(submission(fields), env, async () => { touched = true; });
    assert.equal(result.status, 400, JSON.stringify(fields));
  }
  assert.equal(touched, false);
});

test('keeps normal messages that mention an email address or times', async () => {
  const env = { ENQUIRIES_DB: { prepare() { return { bind() { return { run: async () => ({ success: true }) }; } }; } } };
  const result = await handleEnquiry(submission({ name: 'Dr. A. J. Smith', message: 'Reach me at sam@gmail.com. I am free Sat.Sun after 5.30 p.m.' }), env, async () => {});
  assert.equal(result.status, 200);
});

test('rejects posts that send no origin', async () => {
  const request = submission();
  request.headers.delete('Origin');
  const result = await handleEnquiry(request, {});
  assert.equal(result.status, 403);
});
