import BaseConnection from '../base_connection.js';

export default class CiscoXR extends BaseConnection {
  constructor(device) {
    super(device);
    // Example prompt: RP/0/RSP0/CPU0:XR-1#
    this.prompt = /(.*[#>$])\s*$/;
    // Example config prompt: RP/0/RSP0/CPU0:XR-1(config)#
    this.configPrompt = /(.*\(config[^\)]*\)#\s*)$/;
    this.commit_error_pattern = /Failed to commit/i;
  }

  async commit(commit_command = 'commit') {
    let output = '';
    if (this.checkConfigMode()) {
      this.stream.write(`${commit_command}\n`);
      const commitOutput = await this.readUntilPrompt();
      output += commitOutput;
      if (/Failed to commit/.test(commitOutput)) {
        throw new Error(`Commit failed: ${commitOutput}`);
      }
    }
    return output;
  }

  async sendConfig(commands) {
    const configCmds = Array.isArray(commands) ? commands : [commands];
    let output = '';

    output += await this.configMode();

    for (const command of configCmds) {
      this.stream.write(`${command}\n`);
      const cmdOutput = await this.readUntilPrompt(this.config_prompt);
      this._checkError(command, cmdOutput);
      output += cmdOutput;
    }

    // Commit the changes
    output += await this.commit();

    // Exit config mode
    output += await this.exitConfigMode();

    return output;
  }
} 