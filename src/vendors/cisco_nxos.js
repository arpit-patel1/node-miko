const BaseConnection = require('../base_connection');

class CiscoNXOS extends BaseConnection {
  async configMode(config_command = 'configure terminal') {
    return super.configMode(config_command);
  }
}

module.exports = CiscoNXOS; 