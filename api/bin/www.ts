#!/usr/bin/env node

/**
 * Module dependencies.
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import app from '../app';
import debug from 'debug';
import http from 'http';
import { Logger } from '../utils/logger';

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

server.listen(port);

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
