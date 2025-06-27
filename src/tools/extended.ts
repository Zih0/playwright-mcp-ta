import { z } from 'zod';
import { defineTool } from './tool.js';

const mockApi = defineTool({
  capability: 'core',

  schema: {
    name: 'browser_mock_api',
    title: 'Mock API responses',
    description: 'Mock API responses by intercepting network requests',
    inputSchema: z.object({
      url: z
        .string()
        .describe(
          'URL pattern to match for interception (supports glob and regex patterns)'
        ),
      method: z
        .enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'])
        .optional()
        .describe('HTTP method to match (ALL matches any method)'),
      status: z
        .number()
        .min(100)
        .max(599)
        .default(200)
        .describe('HTTP status code to return'),
      contentType: z
        .string()
        .default('application/json')
        .describe('Content-Type header for the response'),
      body: z
        .string()
        .describe(
          'Response body content (typically JSON formatted as a string)'
        ),
      headers: z
        .record(z.string())
        .optional()
        .describe('Additional response headers to include'),
    }),
    type: 'readOnly',
  },

  handle: async (context, params) => {
    const { page } = await context.ensureTab();

    page.route(params.url, (route) => {
      if (route.request().method() === params.method) {
        route.fulfill({
          status: params.status,
          contentType: params.contentType,
          body: params.body,
          headers: params.headers,
        });
      } else {
        route.continue();
      }
    });

    const code = [
      `// Mock API response for ${params.url}`,
      `await page.route('${params.url}', (route, request) => {`,
      `  if (route.request().method() === '${params.method}') {`,
      `  route.fulfill({`,
      `    status: ${params.status},`,
      `    contentType: '${params.contentType}',`,
      `    body: '${params.body}',`,
      `    headers: {`,
      `      ...${JSON.stringify(params.headers || {})},`,
      `    },`,
      `  });`,
      `  } else {`,
      `    route.continue();`,
      `  }`,
      `});`,
    ];

    return {
      code,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const clearMockApi = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_clear_mock_api',
    title: 'Clear Mock API responses',
    description: 'Clear Mock API responses',
    inputSchema: z.object({
      url: z
        .string()
        .describe(
          'URL pattern to remove mocking for. If not provided, all mocks will be cleared'
        ),
    }),
    type: 'readOnly',
  },
  handle: async (context, params) => {
    const { page } = await context.ensureTab();

    if (params.url) {
      await page.unroute(params.url);
    }

    const code = [
      `// Clear Mock API response for ${params.url}`,
      `await page.unroute('${params.url}');`,
    ];

    return {
      code,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

const setHeaders = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_set_headers',
    title: 'Set Extra HTTP Headers',
    description:
      'Set Extra HTTP Headers for all outgoing requests (key-value pairs, e.g., {"Authorization": "Bearer token", "X-Custom-Header": "value"})',
    inputSchema: z.object({
      headers: z
        .record(z.string())
        .describe(
          'Additional HTTP headers to include in all outgoing requests '
        ),
    }),
    type: 'readOnly',
  },
  handle: async (context, params) => {
    const { page } = await context.ensureTab();
    await page.setExtraHTTPHeaders(params.headers);

    const code = [
      `// Set Extra HTTP Headers`,
      `await page.setExtraHTTPHeaders(${JSON.stringify(params.headers)});`,
    ];

    return {
      code,
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [mockApi, clearMockApi, setHeaders];
