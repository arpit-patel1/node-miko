const CiscoIosConnection = require('./vendors/cisco_ios');
const CiscoNxosConnection = require('./vendors/cisco_nxos');
const CiscoXrConnection = require('./vendors/cisco_xr');
const JuniperJunosConnection = require('./vendors/juniper_junos');

const CLASS_MAPPER = {
  'cisco_ios': CiscoIosConnection,
  'cisco_nxos': CiscoNxosConnection,
  'cisco_xr': CiscoXrConnection,
  'juniper_junos': JuniperJunosConnection,
};

module.exports = {
  get_network_driver(device_type) {
    return CLASS_MAPPER[device_type];
  }
};
