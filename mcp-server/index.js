#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { z } = require("zod");

const API_BASE = process.env.MCP_GATEWAY_API_BASE ?? "https://api.makethe.app";
const API_KEY = process.env.MCP_GATEWAY_API_KEY;

if (!API_KEY) {
  console.error("Error: MCP_GATEWAY_API_KEY environment variable is required");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const Schemas = {
  create_project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    is_public: z.boolean().optional(),
  }),
  create_api_key: z.object({
    name: z.string().min(1),
  }),
  get_public_user: z.object({
    username: z.string().min(1),
  }),
};

async function apiCall(method, path, body = null) {
  const options = {
    method,
    headers,
  };

  // Allow empty objects, but avoid sending a body for GET/DELETE.
  if (body !== null && body !== undefined && method !== "GET" && method !== "DELETE") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();

  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      parsed && typeof parsed === "object" && "error" in parsed
        ? String(parsed.error)
        : text || response.statusText;
    throw new Error(`API request failed (${response.status}): ${message}`);
  }

  return parsed;
}

const server = new Server(
  {
    name: "mcp-gateway",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_user_profile",
        description: "Get the current authenticated user profile",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_projects",
        description: "List all projects for the authenticated user",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_project",
        description: "Create a new project",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Project name" },
            description: { type: "string", description: "Project description" },
            is_public: { type: "boolean", description: "Whether the project is public" },
          },
          required: ["name"],
        },
      },
      {
        name: "get_usage",
        description: "Get API usage statistics and budget information",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "list_api_keys",
        description: "List all API keys for the authenticated user",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "create_api_key",
        description: "Create a new API key",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name for the API key" },
          },
          required: ["name"],
        },
      },
      {
        name: "list_adapters",
        description: "List all LoRA adapters for the authenticated user",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_public_user",
        description: "Get a public user profile by username",
        inputSchema: {
          type: "object",
          properties: {
            username: { type: "string", description: "Username to look up" },
          },
          required: ["username"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  try {
    let result;

    switch (toolName) {
      case "get_user_profile":
        result = await apiCall("GET", "/v1/me");
        break;

      case "list_projects":
        result = await apiCall("GET", "/v1/projects");
        break;

      case "create_project": {
        const parsed = Schemas.create_project.parse(args);
        result = await apiCall("POST", "/v1/projects", {
          name: parsed.name,
          description: parsed.description ?? null,
          is_public: parsed.is_public ?? false,
        });
        break;
      }

      case "get_usage":
        result = await apiCall("GET", "/v1/usage");
        break;

      case "list_api_keys":
        result = await apiCall("GET", "/v1/api-keys");
        break;

      case "create_api_key": {
        const parsed = Schemas.create_api_key.parse(args);
        result = await apiCall("POST", "/v1/api-keys", { name: parsed.name });
        break;
      }

      case "list_adapters":
        result = await apiCall("GET", "/v1/adapters");
        break;

      case "get_public_user": {
        const parsed = Schemas.get_public_user.parse(args);
        result = await apiCall("GET", `/v1/users/${parsed.username}`);
        break;
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
