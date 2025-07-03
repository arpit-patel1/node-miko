import BaseConnection from '../base_connection.js';

export default class LinuxSSH extends BaseConnection {
  constructor(device) {
    super(device);
    // Linux prompts can vary widely, but often end in '$' or '#'.
    // The find_prompt method in BaseConnection should handle this well.
    this.prompt = /[#$]\s*$/;
  }

  async enable() {
    // Linux does not have a separate enable mode.
    return '';
  }

  async sendConfig() {
    throw new Error('Configuration mode is not supported for Linux devices. Use sendCommand() to execute commands.');
  }
} 