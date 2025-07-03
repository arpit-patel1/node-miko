const BaseConnection = require('../base_connection');

class CiscoNxosConnection extends BaseConnection {
  constructor(device) {
    super(device);
    // NX-OS prompts are very similar to IOS
    this.prompt = /([a-zA-Z0-9.\-@_]+[>#])\s*$/;
    this.configPrompt = /([a-zA-Z0-9.\-@_]+\(config[^\)]*\)#\s*)$/;
  }

  async sendConfig(commands) {
    const configCmds = Array.isArray(commands) ? commands : [commands];
    const outputs = [];
    const errorRegex = /%\s*(invalid|incomplete|ambiguous)/i;

    // Enter config mode
    this.stream.write('configure terminal\n');
    outputs.push(await this.readUntilPrompt(this.configPrompt));

    // Send commands
    for (const cmd of configCmds) {
        this.stream.write(`${cmd}\n`);
        const cmd_output = await this.readUntilPrompt(this.configPrompt);
        outputs.push(cmd_output);

        if (errorRegex.test(cmd_output)) {
            // Error detected, abort configuration
            const errorMsg = `Configuration failed on command: '${cmd}'.\nDevice output:\n${cmd_output.trim()}`;
            // Gracefully exit config mode
            this.stream.write('end\n');
            await this.readUntilPrompt(this.prompt);
            throw new Error(errorMsg);
        }
    }

    // Exit config mode
    this.stream.write('end\n');
    outputs.push(await this.readUntilPrompt(this.prompt));
    
    return outputs.join('');
  }
}

module.exports = CiscoNxosConnection; 