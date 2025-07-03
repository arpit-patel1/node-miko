const { Client } = require('ssh2');

const DEFAULT_PROMPT = /([a-zA-Z0-9.\-@()_:\s]+[#>$%])\s*$/;
const STRIP_ANSI = /[\u001b\u009b][[()#;?]*.{0,2}(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const READ_TIMEOUT_MS = 10000; // 10 seconds

class BaseConnection {
  constructor(device) {
    this.device = device;
    this.client = new Client();
    this.stream = null;
    this.prompt = DEFAULT_PROMPT;
    this.loggedIn = false;
    this.base_prompt = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.client.shell(async (err, stream) => {
          if (err) return reject(err);
          this.stream = stream;
          this.loggedIn = true;
          try {
            await this.session_preparation();
            const output = await this.readUntilPrompt();
            resolve(output);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        reject(err);
      });

      this.client.connect({
        host: this.device.host,
        port: this.device.port || 22,
        username: this.device.username,
        password: this.device.password,
      });
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      this.client.end();
      this.loggedIn = false;
      resolve();
    });
  }

  async readUntilPrompt(promptRegex = this.prompt) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const timeout = setTimeout(() => {
        this.stream.removeListener('data', onData);
        reject(new Error('Read timeout'));
      }, READ_TIMEOUT_MS);

      const onData = (data) => {
        const received = data.toString().replace(STRIP_ANSI, '');
        buffer += received;
        const match = buffer.match(promptRegex);
        if (match) {
          this.base_prompt = match[0].trim();
          clearTimeout(timeout);
          this.stream.removeListener('data', onData);
          resolve(buffer);
        }
      };

      this.stream.on('data', onData);
    });
  }

  async session_preparation() {
    // This method is intended to be overridden by subclasses for initial setup
    // like disabling paging. The base implementation does nothing.
    return;
  }

  check_enable_mode() {
    // A simple check on the last known prompt.
    // Privileged EXEC mode on most devices includes a '#'
    return this.base_prompt && this.base_prompt.includes('#');
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.stream) {
        reject(new Error('Connection not established'));
        return;
      }
      this.stream.write(`${command}\n`, (err) => {
        if (err) return reject(err);
        this.readUntilPrompt()
          .then(output => {
            // Strip the command and prompt from the output
            const lines = output.split('\n').slice(1, -1);
            resolve(lines.join('\n').trim());
          })
          .catch(reject);
      });
    });
  }

  async enable() {
    if (this.check_enable_mode()) {
      return '';
    }
    if (!this.device.secret) {
      return '';
    }
    this.stream.write('enable\n');
    await this.readUntilPrompt(/Password:/);
    this.stream.write(`${this.device.secret}\n`);
    const output = await this.readUntilPrompt();
    if (output.includes('Password:')) {
      throw new Error('Failed to enter enable mode: invalid secret');
    }
    return output;
  }

  async sendConfig(commands) {
    const configCmds = Array.isArray(commands) ? commands : [commands];
    let output = '';

    this.stream.write('configure terminal\n');
    output += await this.readUntilPrompt();

    for (const cmd of configCmds) {
      this.stream.write(`${cmd}\n`);
      output += await this.readUntilPrompt();
    }

    this.stream.write('end\n');
    output += await this.readUntilPrompt();
    return output;
  }
}

module.exports = BaseConnection;
