const BaseConnection = require('../base_connection');

class CiscoXrConnection extends BaseConnection {
  constructor(device) {
    super(device);
    // Example prompt: RP/0/RSP0/CPU0:XR-1#
    this.prompt = /(.*[#>$])\s*$/;
    // Example config prompt: RP/0/RSP0/CPU0:XR-1(config)#
    this.configPrompt = /(.*\(config[^\)]*\)#\s*)$/;
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
            const errorMsg = `Configuration failed on command: '${cmd}'.\nDevice output:\n${cmd_output.trim()}`;
            // Abort changes
            this.stream.write('abort\n');
            await this.readUntilPrompt(this.prompt);
            throw new Error(errorMsg);
        }
    }

    // Commit changes
    this.stream.write('commit\n');
    const commit_output = await this.readUntilPrompt(this.configPrompt);
    outputs.push(commit_output);

    if (errorRegex.test(commit_output)) {
        const errorMsg = `Commit failed.\nDevice output:\n${commit_output.trim()}`;
        // Abort changes
        this.stream.write('abort\n');
        await this.readUntilPrompt(this.prompt);
        throw new Error(errorMsg);
    }

    // Exit config mode
    this.stream.write('end\n');
    outputs.push(await this.readUntilPrompt(this.prompt));
    
    return outputs.join('');
  }
}

module.exports = CiscoXrConnection; 