const BaseConnection = require('../base_connection');

class CiscoXr extends BaseConnection {
  constructor(device) {
    super(device);
    // Example prompt: RP/0/RSP0/CPU0:XR-1#
    this.prompt = /(.*[#>$])\s*$/;
    // Example config prompt: RP/0/RSP0/CPU0:XR-1(config)#
    this.configPrompt = /(.*\(config[^\)]*\)#\s*)$/;
    this.commit_error_pattern = /Failed to commit/i;
  }

  async commit() {
    let output = '';
    if (this.check_config_mode()) {
      this.stream.write('commit\n');
      const commitOutput = await this.readUntilPrompt();
      output += commitOutput;

      if (this.commit_error_pattern.test(commitOutput)) {
        this.stream.write('abort\n');
        output += await this.readUntilPrompt();
        throw new Error(`Configuration commit failed: ${commitOutput}`);
      }
    }
    return output;
  }

  async sendConfig(commands) {
    const configCmds = Array.isArray(commands) ? commands : [commands];
    let output = '';

    output += await this.config_mode();

    for (const cmd of configCmds) {
      this.stream.write(`${cmd}\n`);
      output += await this.readUntilPrompt();
      this._checkError(cmd, output);
    }

    output += await this.commit();
    output += await this.exit_config_mode();

    return output;
  }
}

module.exports = CiscoXr; 