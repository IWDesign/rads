import { sendLeadEmail } from './lead-email.mjs';

const MAX_BODY_LENGTH = 16_384;
const text = (value, max) => String(value ?? '').trim().slice(0, max + 1);

function response(message, status) {
  return Response.json({ message }, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function handleEnquiry(request, env, notify = sendLeadEmail) {
  if (request.method !== 'POST') return response('Method not allowed.', 405);

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return response('Invalid origin.', 403);
  }
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) {
    return response('Invalid form format.', 415);
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_LENGTH) {
    return response('Form is too large.', 413);
  }

  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH) return response('Form is too large.', 413);
  const form = new URLSearchParams(body);
  if (form.get('bot-field')) return response('Thank you.', 200);

  const name = text(form.get('name'), 120);
  const email = text(form.get('email'), 254);
  const phone = text(form.get('phone'), 50);
  const goal = text(form.get('goal'), 120);
  const style = text(form.get('style'), 120);
  const message = text(form.get('message'), 2000);

  if (!name || name.length > 120 || !email || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      phone.length > 50 || goal.length > 120 || style.length > 120 ||
      message.length > 2000) {
    return response('Please check your details and try again.', 400);
  }
  if (!env.ENQUIRIES_DB) {
    console.error('Missing ENQUIRIES_DB binding');
    return response('Enquiries are temporarily unavailable.', 503);
  }

  const lead = {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    name, email, phone, goal, style, message
  };

  try {
    const result = await env.ENQUIRIES_DB.prepare(
      'INSERT INTO enquiries (id, created_at, name, email, phone, goal, style, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(lead.id, lead.createdAt, name, email, phone, goal, style, message).run();
    if (result.success === false) throw new Error('D1 insert failed');
  } catch (error) {
    console.error('Failed to save enquiry', error);
    return response('Your enquiry could not be saved. Please try again.', 500);
  }

  try {
    await notify(lead, env);
  } catch (error) {
    console.error(`Lead ${lead.id} was saved but email notification failed`, error);
  }
  return response('Thank you. Your enquiry was received.', 200);
}
