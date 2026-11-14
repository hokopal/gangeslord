export type McpTool = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
  /** Tools that change data need a read-write key. */
  write?: boolean;
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

type Json = Record<string, unknown>;

const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export const SERVER_INFO = { name: 'fello', title: 'Pipemouse', version: '1.0.0' };
const INSTRUCTIONS =
  'Pipemouse is a sales room platform. Sellers bundle content into tracks and share them with buyers as rooms. ' +
  'Use these tools to look up library content and tracks, read engagement analytics, and create personal room links for named recipients.';

const result = (id: unknown, value: unknown) => ({ jsonrpc: '2.0', id, result: value });
const failure = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/**
 * Answers one JSON-RPC message of the Model Context Protocol. Returns null for notifications,
 * which expect no reply. Tool failures are reported inside the result, as the protocol asks,
 * so the calling model can read them and recover.
 */
export async function handleMcpMessage(message: unknown, tools: readonly McpTool[], context: { canWrite: boolean }): Promise<Json | null> {
  if (typeof message !== 'object' || message === null || Array.isArray(message)) return failure(null, -32600, 'Invalid request.');
  const { jsonrpc, id, method, params } = message as { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: Json };
  if (jsonrpc !== '2.0' || typeof method !== 'string') return failure(id, -32600, 'Invalid request.');
  if (id === undefined || id === null) return null;

  switch (method) {
    case 'initialize': {
      const requested = typeof params?.protocolVersion === 'string' ? params.protocolVersion : '';
      return result(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: { readOnlyHint: !t.write },
        })),
      });
    case 'tools/call': {
      const tool = tools.find((t) => t.name === params?.name);
      if (!tool) return failure(id, -32602, `Unknown tool: ${String(params?.name)}`);
      const args = typeof params?.arguments === 'object' && params.arguments !== null ? (params.arguments as Record<string, unknown>) : {};
      const text = (value: string, isError = false) => result(id, { content: [{ type: 'text', text: value }], isError });
      if (tool.write && !context.canWrite) return text('This API key is read-only. Create a read-write key in Pipemouse under Integrations to use this tool.', true);
      const missing = (tool.inputSchema.required ?? []).filter((name) => args[name] === undefined || args[name] === null || args[name] === '');
      if (missing.length > 0) return text(`Missing required argument${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`, true);
      try {
        return text(JSON.stringify(await tool.run(args), null, 2));
      } catch (error) {
        // Only messages we wrote ourselves are passed on; anything unexpected is reported generically.
        const known = error instanceof Error && error.name === 'ApiError';
        return text(known ? (error as Error).message : 'The tool failed. Try again.', true);
      }
    }
    default:
      return failure(id, -32601, `Method not found: ${method}`);
  }
}

/** Handles a request body that is one message or a batch. Returns null when nothing needs a reply. */
export async function handleMcpBody(body: unknown, tools: readonly McpTool[], context: { canWrite: boolean }): Promise<Json | Json[] | null> {
  if (Array.isArray(body)) {
    if (body.length === 0 || body.length > 20) return failure(null, -32600, 'Invalid request.');
    const replies = (await Promise.all(body.map((m) => handleMcpMessage(m, tools, context)))).filter((r): r is Json => r !== null);
    return replies.length > 0 ? replies : null;
  }
  return handleMcpMessage(body, tools, context);
}
