const EMAIL_ENDPOINT = 'https://api.resend.com/emails';

export async function sendLeadEmail(lead, env, fetcher = fetch) {
  if (!env.RESEND_API_KEY || !env.LEAD_EMAIL_FROM || !env.LEAD_EMAIL_TO) {
    throw new Error('Resend lead notification is not configured');
  }

  const body = {
    from: env.LEAD_EMAIL_FROM,
    to: [env.LEAD_EMAIL_TO],
    reply_to: lead.email,
    subject: 'New RADS class enquiry',
    text: [
      'A new class enquiry was submitted through the RADS website.',
      '',
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || 'Not provided'}`,
      `Goal: ${lead.goal || 'Not provided'}`,
      `Dance style: ${lead.style || 'Not provided'}`,
      '',
      'Message:',
      lead.message || 'Not provided',
      '',
      `Enquiry ID: ${lead.id}`,
      `Submitted: ${lead.createdAt}`
    ].join('\n')
  };

  const result = await fetcher(EMAIL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `rads-enquiry/${lead.id}`
    },
    body: JSON.stringify(body)
  });

  if (!result.ok) throw new Error(`Resend rejected lead notification (${result.status})`);
}
