import { connectLambda, getStore } from '@netlify/blobs';

// Reads the authenticated user's saved Timeless Movements data.
// Requires an "Authorization: Bearer <identity-jwt>" header, which the
// client sends automatically once someone is logged in via Netlify Identity.
export const handler = async (event, context) => {
  // Required before touching Blobs in the classic Lambda-compatible handler.
  connectLambda(event);

  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not authenticated' }),
    };
  }

  try {
    const store = getStore('timeless-movements-users');
    const data = await store.get(user.sub, { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data || null }),
    };
  } catch (err) {
    console.error('get-data failed', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not load data' }),
    };
  }
};
