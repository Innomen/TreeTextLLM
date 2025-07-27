
"use server";

import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod';

// Define the schema for all incoming requests to this proxy
const LlmRequestSchema = z.object({
  // The user-provided URL for their local LLM server
  baseUrl: z.string().url(),
  // The payload to be sent to the LLM
  payload: z.object({
    model: z.string().default('local-model'),
    messages: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      })
    ),
    response_format: z.object({type: z.enum(['json_object'])}).optional(),
    stream: z.boolean().default(false),
  }),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Validate the incoming request body
    const body = await req.json();
    const {baseUrl, payload} = LlmRequestSchema.parse(body);

    // 2. Prepare the request to the actual LLM server
    // Replace localhost with 127.0.0.1 to avoid Node.js fetch issues with IPv6.
    const sanitizedUrl = baseUrl.replace('localhost', '127.0.0.1');
    const fetchUrl = new URL(sanitizedUrl);
    // Many OpenAI-compatible servers expect this path.
    fetchUrl.pathname = '/v1/chat/completions';
    
    const llmResponse = await fetch(fetchUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // 3. Handle non-ok responses from the LLM server
    if (!llmResponse.ok) {
      const errorBody = await llmResponse.text();
      let parsedError = errorBody;
      try {
        // Try to parse the error body as JSON for better formatting
        parsedError = JSON.parse(errorBody);
      } catch (e) {
        // Not a JSON error, use the raw text
      }
      console.error(`LLM API request failed with status ${llmResponse.status}:`, parsedError);
      // Forward the error from the LLM server to the client
      return new NextResponse(
         JSON.stringify({
          error: `API request failed with status ${llmResponse.status}: ${errorBody}`,
        }),
        {
          status: llmResponse.status,
          headers: {'Content-Type': 'application/json'},
        }
      );
    }

    // 4. Stream the response back to the client
    const data = await llmResponse.json();

    // 5. Return the successful response
    return NextResponse.json(data);
  } catch (error) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof z.ZodError) {
      errorMessage = 'Invalid request body: ' + error.message;
      return new NextResponse(JSON.stringify({error: errorMessage}), {
        status: 400,
        headers: {'Content-Type': 'application/json'},
      });
    } else if (error instanceof Error) {
        // This is to catch fetch errors like ECONNREFUSED
        if (error.cause) {
            const fetchError = error.cause as any;
            errorMessage = `Could not connect to the local LLM server. Is it running? Details: ${fetchError.code || error.message}`;
        } else {
             errorMessage = error.message;
        }
    }
    console.error('Error in LLM proxy route:', error);
    return new NextResponse(JSON.stringify({error: errorMessage}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }
}
