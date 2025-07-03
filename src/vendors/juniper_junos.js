const BaseConnection = require('../base_connection');

class JuniperJunos extends BaseConnection {
  constructor(device) {
    super(device);
    this.config_prompt = /\[edit\]\r\n[a-zA-Z0-9.\-@_]+#\s*$/;
    this.commit_error_pattern = /error:/i;
  }

  async session_preparation() {
    this.stream.write('set cli screen-length 0\n');
    await this.readUntilPrompt();
  }

  async enable() {
    return ''; // Junos doesn't have an enable mode
  }

  async config_mode(config_command = 'configure') {
    return super.config_mode(config_command);
  }

  async exit_config_mode(exit_command = 'exit') {
    return super.exit_config_mode(exit_command);
  }

  async commit() {
    let output = '';
    if (this.check_config_mode()) {
      this.stream.write('commit\n');
      const commitOutput = await this.readUntilPrompt();
      output += commitOutput;

      if (this.commit_error_pattern.test(commitOutput)) {
        this.stream.write('rollback 0\n');
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
      const cmdOutput = await this.readUntilPrompt();
      output += cmdOutput;
      this._checkError(cmd, cmdOutput);
    }

    output += await this.commit();
    output += await this.exit_config_mode();

    return output;
  }
}

module.exports = JuniperJunos; 