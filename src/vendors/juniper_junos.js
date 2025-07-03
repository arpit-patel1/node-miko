const BaseConnection = require('../base_connection');

class JuniperJunosConnection extends BaseConnection {
  constructor(device) {
    super(device);
    this.prompt = /([a-zA-Z0-9.\-@_]+[>])\s*$/;
    this.configPrompt = /([a-zA-Z0-9.\-@_]+\(#\))\s*$/;
  }

  async session_preparation() {
    await this.sendCommand('set cli screen-length 0');
    // In Junos, privileged mode is the default state, so no 'enable' call is needed.
  }

  async enable() {
    // Juniper devices do not have a separate 'enable' mode.
    // This method is overridden to prevent any attempts to enter one.
    return '';
  }

  async sendConfig(commands) {
    const configCmds = Array.isArray(commands) ? commands : [commands];
    let output = '';

    // Enter config mode
    this.stream.write('configure\n');
    output += await this.readUntilPrompt(this.configPrompt);

    // Send commands
    for (const cmd of configCmds) {
      this.stream.write(`${cmd}\n`);
      output += await this.readUntilPrompt(this.configPrompt);
    }

    // Commit changes
    this.stream.write('commit\n');
    // The commit command can take time, we wait for the config prompt to return.
    output += await this.readUntilPrompt(this.configPrompt); 

    // Exit config mode
    this.stream.write('exit\n');
    output += await this.readUntilPrompt(this.prompt);
    
    return output;
  }
}

module.exports = JuniperJunosConnection; 