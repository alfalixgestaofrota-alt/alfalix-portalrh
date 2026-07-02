import type { Handler, HandlerEvent } from '@netlify/functions';
import { handleApiRequest } from '../../src/server/api.js';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function parseBody(event: HandlerEvent): unknown {
  if (!event.body) {
    return undefined;
  }

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}

export const handler: Handler = async (event) => {
  const response = await handleApiRequest({
    method: event.httpMethod,
    path: event.path,
    body: parseBody(event),
    query: event.queryStringParameters || {},
  });

  if (response.body === null) {
    return {
      statusCode: response.status,
      headers,
      body: '',
    };
  }

  return {
    statusCode: response.status,
    headers,
    body: JSON.stringify(response.body),
  };
};
