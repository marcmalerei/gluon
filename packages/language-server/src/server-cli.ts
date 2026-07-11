#!/usr/bin/env node
import { stdin, stdout } from 'node:process';
import { GluonProtocolServer, type JsonRpcRequest, type JsonRpcResponse } from './protocol.js';

const server = new GluonProtocolServer();
let buffer = Buffer.alloc(0);

stdin.on('data', (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});

function readMessages(): void {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd < 0) return;
    const header = buffer.subarray(0, headerEnd).toString('ascii');
    const length = Number(/Content-Length:\s*(\d+)/i.exec(header)?.[1]);
    if (!Number.isSafeInteger(length) || length < 0) {
      process.stderr.write('LSP_HEADER_INVALID: Content-Length is required.\n');
      process.exitCode = 1;
      return;
    }
    const messageEnd = headerEnd + 4 + length;
    if (buffer.length < messageEnd) return;
    const payload = buffer.subarray(headerEnd + 4, messageEnd).toString('utf8');
    buffer = buffer.subarray(messageEnd);
    try {
      for (const response of server.handle(JSON.parse(payload) as JsonRpcRequest)) writeMessage(response);
    } catch (error) {
      process.stderr.write(`LSP_MESSAGE_INVALID: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
}

function writeMessage(message: JsonRpcResponse): void {
  const payload = JSON.stringify(message);
  stdout.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);
}
