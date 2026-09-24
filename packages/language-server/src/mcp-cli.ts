#!/usr/bin/env node
import { stdin, stdout } from 'node:process';
import { GluonMcpServer, type McpRequest } from './mcp.js';

const server = new GluonMcpServer();
let buffer = '';
stdin.setEncoding('utf8');
stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf('\n');
  while (newline >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) {
      try { stdout.write(`${JSON.stringify(server.handle(JSON.parse(line) as McpRequest))}\n`); }
      catch (error) { stdout.write(`${JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: String(error) } })}\n`); }
    }
    newline = buffer.indexOf('\n');
  }
});
