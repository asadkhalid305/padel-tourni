#!/usr/bin/env node

import readline from "node:readline";

const apiKey = process.env.LINEAR_API_KEY;

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, value) {
  send({ jsonrpc: "2.0", id, result: value });
}

function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function linearGraphql(arguments_) {
  if (!apiKey) {
    throw new Error(
      "LINEAR_API_KEY is not set. Add it to .env.local before starting the MCP server.",
    );
  }

  const query = arguments_?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new Error("linear_graphql requires a non-empty query string.");
  }

  const variables = arguments_?.variables ?? undefined;
  if (
    variables !== undefined &&
    (typeof variables !== "object" || Array.isArray(variables))
  ) {
    throw new Error(
      "linear_graphql variables must be an object when provided.",
    );
  }

  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      `Linear returned non-JSON response with status ${response.status}: ${text}`,
    );
  }

  if (!response.ok || payload.errors) {
    throw new Error(
      JSON.stringify(
        { status: response.status, errors: payload.errors ?? payload },
        null,
        2,
      ),
    );
  }

  return payload;
}

const tools = [
  {
    name: "linear_graphql",
    description:
      "Run an authenticated Linear GraphQL query using LINEAR_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Linear GraphQL query or mutation.",
        },
        variables: {
          type: "object",
          description: "Optional GraphQL variables.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

const rl = readline.createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  if (!line.trim()) return;

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method, params } = message;

  try {
    if (method === "initialize") {
      result(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "padeltour-linear", version: "0.1.0" },
      });
      return;
    }

    if (method === "notifications/initialized") return;

    if (method === "tools/list") {
      result(id, { tools });
      return;
    }

    if (method === "tools/call") {
      if (params?.name !== "linear_graphql") {
        throw new Error(`Unknown tool: ${params?.name}`);
      }

      const payload = await linearGraphql(params.arguments);
      result(id, {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        isError: false,
      });
      return;
    }

    if (id !== undefined) error(id, -32601, `Method not found: ${method}`);
  } catch (exception) {
    if (method === "tools/call") {
      result(id, {
        content: [
          {
            type: "text",
            text:
              exception instanceof Error
                ? exception.message
                : String(exception),
          },
        ],
        isError: true,
      });
      return;
    }

    error(
      id,
      -32000,
      exception instanceof Error ? exception.message : String(exception),
    );
  }
});
