import { connectLambda, getStore } from '@netlify/blobs';

// A generous but real ceiling — prevents a corrupted client state or an
// abusive request from writing unbounded data into a single blob.
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB

// Saves the authenticated user's Timeless Movements data.
// Requires an "Authorization: Bearer <identity-jwt>" header.
export const handler = async (event, context) => {
  connectLambda(event);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated' }),
    };
  }

  const raw = event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return {
      statusCode: 413,
      body: JSON.stringify({ error: 'Payload too large' }),
    };
  }

  // Confirm it's valid JSON before writing — a malformed save should never
  // be allowed to overwrite a user's last-known-good data.
  try {
    JSON.parse(raw);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload' }),
    };
  }

  try {
    const store = getStore('timeless-movements-users');
    await store.set(user.sub, raw);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('save-data failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not save data' }),
    };
  }
};
