#!/usr/bin/env node
/**
 * Cloudflare MCP Server
 *
 * Provides MCP tools for managing Cloudflare Workers and Pages deployments
 * Wraps the Wrangler CLI and Cloudflare API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const server = new Server(
  {
    name: 'cloudflare-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'deploy_worker',
    description: 'Deploy a Cloudflare Worker using Wrangler',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Path to the worker directory',
        },
      },
      required: ['directory'],
    },
  },
  {
    name: 'deploy_pages',
    description: 'Deploy a Cloudflare Pages application',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Path to the build output directory',
        },
        project_name: {
          type: 'string',
          description: 'Name of the Pages project',
        },
      },
      required: ['directory', 'project_name'],
    },
  },
  {
    name: 'build_next_for_pages',
    description: 'Build a Next.js app for Cloudflare Pages using @cloudflare/next-on-pages',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Path to the Next.js project directory',
        },
      },
      required: ['directory'],
    },
  },
  {
    name: 'd1_execute',
    description: 'Execute SQL on a Cloudflare D1 database',
    inputSchema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          description: 'Name of the D1 database',
        },
        sql: {
          type: 'string',
          description: 'SQL query to execute',
        },
        file: {
          type: 'string',
          description: 'Path to SQL file (alternative to sql parameter)',
        },
      },
      required: ['database'],
    },
  },
  {
    name: 'list_workers',
    description: 'List all Cloudflare Workers in the account',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_pages_projects',
    description: 'List all Cloudflare Pages projects',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_deployment_status',
    description: 'Get the status of a deployment',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'Name of the Pages project or Worker',
        },
        type: {
          type: 'string',
          enum: ['worker', 'pages'],
          description: 'Type of deployment',
        },
      },
      required: ['project_name', 'type'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'deploy_worker': {
        const { directory } = args as { directory: string };
        const { stdout, stderr } = await execAsync('pnpm wrangler deploy', {
          cwd: directory,
        });
        result = stdout || stderr;
        break;
      }

      case 'deploy_pages': {
        const { directory, project_name } = args as {
          directory: string;
          project_name: string;
        };
        const { stdout, stderr } = await execAsync(
          `pnpm wrangler pages deploy ${directory} --project-name=${project_name}`,
          { cwd: directory }
        );
        result = stdout || stderr;
        break;
      }

      case 'build_next_for_pages': {
        const { directory } = args as { directory: string };
        const { stdout, stderr } = await execAsync('npx @cloudflare/next-on-pages', {
          cwd: directory,
        });
        result = `Build completed:\n${stdout}\n${stderr}`;
        break;
      }

      case 'd1_execute': {
        const { database, sql, file } = args as {
          database: string;
          sql?: string;
          file?: string;
        };

        let command: string;
        if (file) {
          command = `pnpm wrangler d1 execute ${database} --file=${file}`;
        } else if (sql) {
          command = `pnpm wrangler d1 execute ${database} --command="${sql}"`;
        } else {
          throw new Error('Either sql or file must be provided');
        }

        const { stdout, stderr } = await execAsync(command);
        result = stdout || stderr;
        break;
      }

      case 'list_workers': {
        const { stdout } = await execAsync('pnpm wrangler deployments list');
        result = stdout;
        break;
      }

      case 'list_pages_projects': {
        const { stdout } = await execAsync('pnpm wrangler pages project list');
        result = stdout;
        break;
      }

      case 'get_deployment_status': {
        const { project_name, type } = args as { project_name: string; type: string };

        let command: string;
        if (type === 'worker') {
          command = `pnpm wrangler deployments list`;
        } else {
          command = `pnpm wrangler pages deployment list --project-name=${project_name}`;
        }

        const { stdout } = await execAsync(command);
        result = stdout;
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\nStderr: ${error.stderr || 'N/A'}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cloudflare MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
