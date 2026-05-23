#!/usr/bin/env node

/**
 * Module dependencies.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from '@api/app';
import { getAuthVerificationStartupInfo } from '@api/auth/supabaseAuthMiddleware';
import debug from 'debug';
import http from 'http';
import { Logger } from '@api/utils/logger';

const app = createApp();

const debugLog = debug('api:server');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

// Validate port before listening
if (port === false) {
  Logger.error('Invalid port specified');
  process.exit(1);
}

// Attach error handlers before listening
server.on('error', onError);
server.on('listening', onListening);

// Log the port we're trying to use
Logger.server(`Starting server on port ${port}...`);
try {
  const auth = getAuthVerificationStartupInfo();
  Logger.info(
    `[auth] verification mode=${auth.mode} issuer=${auth.issuer} audience=${auth.audience}`,
  );
} catch (error) {
  Logger.warning(
    `[auth] unable to resolve verification startup config: ${error instanceof Error ? error.message : 'unknown'}`,
  );
}

server.listen(port);

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  Logger.info(`[server] received ${signal}; closing HTTP server...`);
  server.close((error?: Error) => {
    if (error) {
      Logger.error(`[server] graceful shutdown failed: ${error.message}`);
      process.exit(1);
      return;
    }
    Logger.success('[server] HTTP server closed cleanly');
    process.exit(0);
  });

  setTimeout(() => {
    Logger.warning('[server] force exit after shutdown timeout');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string): number | string | false {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      Logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      Logger.error(`${bind} is already in use`);
      Logger.warning('Try running with a different port: PORT=3001 npm run dev');
      process.exit(1);
      break;
    case 'EPERM':
      Logger.error(`${bind} - permission denied`);
      Logger.warning('This may be due to sandbox restrictions or system security settings.');
      Logger.info('Try running with a different port: PORT=3001 npm run dev');
      process.exit(1);
      break;
    default:
      Logger.error('Server error: ' + error.message);
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr?.port;
  debugLog('Listening on ' + bind);
  
  Logger.divider();
  Logger.success(`Server is listening on ${bind}`);
  Logger.info(`API Documentation: http://localhost:${addr && typeof addr !== 'string' ? addr.port : 3000}/api-docs`);
  Logger.divider();
}
