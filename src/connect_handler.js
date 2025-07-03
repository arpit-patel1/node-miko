const { ssh_dispatcher } = require('./ssh_dispatcher');

function ConnectHandler(device) {
  const ConnectionClass = ssh_dispatcher(device.device_type);
  return new ConnectionClass(device);
}

module.exports = {
  ConnectHandler,
};
