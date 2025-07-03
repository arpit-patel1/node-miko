const { get_network_driver } = require('./ssh_dispatcher');

async function ConnectHandler(device) {
  const Driver = get_network_driver(device.device_type);
  if (!Driver) {
    throw new Error(`Unsupported device_type: ${device.device_type}`);
  }

  const connection = new Driver(device);
  await connection.connect();

  if (device.secret) {
    await connection.enable();
  }

  return connection;
}

async function withConnection(device, task) {
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

module.exports = { ConnectHandler, withConnection };
