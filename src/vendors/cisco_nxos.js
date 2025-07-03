import BaseConnection from '../base_connection.js';

export default class CiscoNXOS extends BaseConnection {
  async configMode(config_command = 'configure terminal') {
    return super.configMode(config_command);
  }
} 