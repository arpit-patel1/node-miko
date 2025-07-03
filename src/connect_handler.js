const { ssh_dispatcher } = require('./ssh_dispatcher');

async function ConnectHandler(device) {
  const ConnectionClass = ssh_dispatcher(device.device_type);
  const connection = new ConnectionClass(device);

  await connection.connect();

  // Enter enable mode if a secret is provided
  if (device.secret) {
    await connection.enable();
  }

  return connection;
}

module.exports = {
  ConnectHandler,
};
