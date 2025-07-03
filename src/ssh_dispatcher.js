import CiscoIOS from './vendors/cisco_ios.js';
import CiscoNXOS from './vendors/cisco_nxos.js';
import CiscoXR from './vendors/cisco_xr.js';
import JuniperJunos from './vendors/juniper_junos.js';
import LinuxSSH from './vendors/linux_ssh.js';

const CLASS_MAPPER = {
  'cisco_ios': CiscoIOS,
  'cisco_nxos': CiscoNXOS,
  'cisco_xr': CiscoXR,
  'juniper_junos': JuniperJunos,
  'linux_ssh': LinuxSSH,
};

export function ssh_dispatcher(device_type) {
  const ConnectionClass = CLASS_MAPPER[device_type];
  if (!ConnectionClass) {
    throw new Error(`Unsupported device type: ${device_type}`);
  }
  return ConnectionClass;
}
