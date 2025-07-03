import BaseConnection from '../base_connection.js';

export default class JuniperJunos extends BaseConnection {
  constructor(device) {
    super(device);
    this.config_prompt = /\[edit\]\r\n[a-zA-Z0-9.\-@_]+#\s*$/;
    this.commit_error_pattern = /error:/i;
  }

  async sessionPreparation() {
    await this.sendCommand('set cli screen-length 0');
    await this.sendCommand('set cli screen-width 511');
    return '';
  }

  async enable() {
    // Junos doesn't have a separate enable mode, so we do nothing.
    return '';
  }

  async configMode(config_command = 'configure') {
    return super.configMode(config_command);
  }

  async exitConfigMode(exit_command = 'exit configuration-mode') {
    return super.exitConfigMode(exit_command);
  }

  async commit(commit_command = 'commit') {
    let output = '';
    if (this.check_config_mode()) {
      this.stream.write(commit_command + '\n');
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

    output += await this.configMode();

    for (const cmd of configCmds) {
      this.stream.write(`${cmd}\n`);
      const cmdOutput = await this.readUntilPrompt();
      output += cmdOutput;
      this._checkError(cmd, cmdOutput);
    }

    output += await this.commit();
    output += await this.exitConfigMode();

    return output;
  }
} 