const CiscoIOS = require('./vendors/cisco_ios');
const CiscoNXOS = require('./vendors/cisco_nxos');
const CiscoXR = require('./vendors/cisco_xr');
const JuniperJunos = require('./vendors/juniper_junos');
const LinuxSSH = require('./vendors/linux_ssh');

const CLASS_MAPPER = {
  'cisco_ios': CiscoIOS,
  'cisco_nxos': CiscoNXOS,
  'cisco_xr': CiscoXR,
  'juniper_junos': JuniperJunos,
  'linux_ssh': LinuxSSH,
};

function ssh_dispatcher(device_type) {
  const ConnectionClass = CLASS_MAPPER[device_type];
  if (!ConnectionClass) {
    throw new Error(`Unsupported device type: ${device_type}`);
  }
  return ConnectionClass;
}

module.exports = {
  ssh_dispatcher,
};
