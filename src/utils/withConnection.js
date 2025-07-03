import { ConnectHandler } from '../connect_handler.js';

/**
 * A utility function that ensures the connection is closed after the task is complete.
 * It acts like a context manager.
 * @param {object} device - The device object for connection.
 * @param {function} task - The async function to execute with the connection object.
 */
export async function withConnection(device, task) {
  let connection;
  try {
    connection = await ConnectHandler(device);
    await task(connection);
  } finally {
    if (connection && connection.loggedIn) {
      await connection.disconnect();
    }
  }
} 