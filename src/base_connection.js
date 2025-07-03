import { Client } from 'ssh2';
import fs from 'fs';

const DEFAULT_PROMPT = /([a-zA-Z0-9.\-@()_:\s]+[#>$%])\s*$/;
const STRIP_ANSI = /[\u001b\u009b][[()#;?]*.{0,2}(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export default class BaseConnection {
  constructor(device) {
    this.device = device;
    this.client = new Client();
    this.stream = null;
    this.prompt = DEFAULT_PROMPT;
    this.config_prompt = /\(config.*\)#\s*$/;
    this.loggedIn = false;
    this.base_prompt = ''; // The detected prompt string, without regex formatting

    // Timeouts
    this.conn_timeout = device.conn_timeout || 20000; // Default: 20 seconds
    this.read_timeout = device.read_timeout || 10000; // Default: 10 seconds
    this.global_delay_factor = device.global_delay_factor || 1;

    this.config_error_pattern = /(?:Invalid|Incomplete|Ambiguous) command/i;

    // Aliases for netmiko compatibility
    this.send_command = this.sendCommand;
    this.send_command_timing = this.sendCommandTiming;
    this.send_config = this.sendConfig;
    this.find_prompt = this.findPrompt;
    this.check_enable_mode = this.checkEnableMode;
    this.config_mode = this.configMode;
    this.check_config_mode = this.checkConfigMode;
    this.exit_config_mode = this.exitConfigMode;
    this.session_preparation = this.sessionPreparation;
    this.file_transfer = this.fileTransfer;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  _checkError(command, output) {
    if (this.config_error_pattern.test(output)) {
      throw new Error(`Configuration failed: Error while sending command: "${command}"\nOutput: ${output}`);
    }
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.client.shell((err, stream) => {
          if (err) return reject(err);
          this.stream = stream;
          this.loggedIn = true;
          this.sessionPreparation()
            .then(() => {
              this.findPrompt()
                .then(() => resolve(this))
                .catch(reject);
            })
            .catch(reject);
        });
      }).on('error', (err) => {
        reject(err);
      });

      const connectParams = {
        host: this.device.host,
        port: this.device.port || 22,
        username: this.device.username,
        readyTimeout: this.conn_timeout,
      };

      if (this.device.use_keys && this.device.key_file) {
        if (!fs.existsSync(this.device.key_file)) {
          return reject(new Error(`Key file not found at path: ${this.device.key_file}`));
        }
        connectParams.privateKey = fs.readFileSync(this.device.key_file);
        if (this.device.passphrase) {
          connectParams.passphrase = this.device.passphrase;
        }
      } else if (this.device.password) {
        connectParams.password = this.device.password;
      } else {
        return reject(new Error('Authentication method required: please provide either a password or SSH key.'));
      }

      this.client.connect(connectParams);
    });
  }

  async disconnect() {
    return new Promise((resolve) => {
      if (!this.loggedIn) {
        resolve();
        return;
      }
      this.client.on('close', () => {
        this.loggedIn = false;
        resolve();
      });
      this.client.end();
    });
  }

  readUntilTimeout(timeout) {
    return new Promise((resolve) => {
      let output = '';
      const dataHandler = (data) => {
        output += data.toString().replace(STRIP_ANSI, '');
      };
      this.stream.on('data', dataHandler);

      setTimeout(() => {
        this.stream.removeListener('data', dataHandler);
        resolve(output);
      }, timeout);
    });
  }

  async readUntilPrompt(promptRegex = this.prompt, timeout = this.read_timeout) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const timeoutId = setTimeout(() => {
        this.stream.removeListener('data', onData);
        reject(new Error(`Read timeout (${timeout}ms) looking for prompt: ${promptRegex}`));
      }, timeout);

      const onData = (data) => {
        const received = data.toString().replace(STRIP_ANSI, '');
        buffer += received;
        const match = buffer.match(promptRegex);
        if (match) {
          this.base_prompt = match[0].trim();
          clearTimeout(timeoutId);
          this.stream.removeListener('data', onData);
          resolve(buffer);
        }
      };

      this.stream.on('data', onData);
    });
  }

  async findPrompt() {
    return new Promise((resolve, reject) => {
      if (!this.stream) {
        return reject(new Error('Connection not established'));
      }
      this.stream.write('\n', async (err) => {
        if (err) return reject(err);
        try {
          await this._delay(300 * this.global_delay_factor);
          const output = await this.readUntilTimeout(1500);
          const lines = output.trim().split('\n');
          const new_prompt = lines[lines.length - 1].trim();
          if (new_prompt && new_prompt.length > 1) {
            this.base_prompt = new_prompt;
            this.prompt = new RegExp(this.escapeRegExp(this.base_prompt) + '\\s*$');
            resolve(this.prompt);
          } else {
            // Fallback to a generic prompt if detection fails
            this.prompt = DEFAULT_PROMPT;
            resolve(this.prompt);
          }
        } catch (e) {
          // Fallback to a generic prompt on error
          this.prompt = DEFAULT_PROMPT;
          resolve(this.prompt);
        }
      });
    });
  }

  async sessionPreparation() {
    // This method is intended to be overridden by subclasses for initial setup
    // like disabling paging. The base implementation does nothing.
    return Promise.resolve();
  }

  checkEnableMode() {
    // Privileged EXEC mode on most devices includes a '#'
    return this.base_prompt.includes('#');
  }

  async sendCommand(command, options = {}) {
    const {
      expect_string = null,
      strip_prompt = true,
      strip_command = true,
    } = options;

    return new Promise((resolve, reject) => {
      if (!this.stream) {
        return reject(new Error('Connection not established'));
      }
      this.stream.write(`${command}\n`, async (err) => {
        if (err) return reject(err);
        await this._delay(50 * this.global_delay_factor);
        try {
          const promptRegex = expect_string ? new RegExp(expect_string) : this.prompt;
          // Use the default timeout for this method
          let output = await this.readUntilPrompt(promptRegex, this.read_timeout);

          if (strip_command) {
            output = output.replace(new RegExp(`^${command}\\s*\\r?\\n`), '');
          }
          if (strip_prompt) {
            output = output.replace(promptRegex, '');
          }

          resolve(output.trim());
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async sendCommandTiming(command, options = {}) {
    const {
      expect_string = null,
      strip_prompt = true,
      strip_command = true,
      delay_factor = 1,
    } = options;

    return new Promise((resolve, reject) => {
      if (!this.stream) {
        return reject(new Error('Connection not established'));
      }
      this.stream.write(`${command}\n`, async (err) => {
        if (err) return reject(err);
        await this._delay(50 * this.global_delay_factor);
        try {
          const promptRegex = expect_string ? new RegExp(expect_string) : this.prompt;
          const command_timeout = this.read_timeout * delay_factor;
          let output = await this.readUntilPrompt(promptRegex, command_timeout);

          if (strip_command) {
            output = output.replace(new RegExp(`^${command}\\s*\\r?\\n`), '');
          }
          if (strip_prompt) {
            output = output.replace(promptRegex, '');
          }

          resolve(output.trim());
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async enable() {
    if (this.checkEnableMode()) {
      return '';
    }
    if (!this.device.secret) {
      return 'No secret provided. Cannot enter enable mode.';
    }

    return new Promise((resolve, reject) => {
      this.stream.write('enable\n', async (err) => {
        if (err) return reject(err);
        try {
          let output = await this.readUntilPrompt(/Password:/i);
          this.stream.write(`${this.device.secret}\n`, async (writeErr) => {
            if (writeErr) return reject(writeErr);
            
            await this.findPrompt();
            const remainingOutput = await this.readUntilPrompt();
            output += remainingOutput;

            if (this.checkEnableMode()) {
              resolve(output);
            } else {
                reject(new Error('Failed to enter enable mode. Please check the secret.'));
            }
          });
        } catch (e) {
          reject(new Error(`Failed to enter enable mode: ${e.message}`));
        }
      });
    });
  }

  checkConfigMode() {
    return this.config_prompt.test(this.base_prompt);
  }

  async configMode(config_command = 'configure terminal') {
    let output = '';
    if (!this.checkConfigMode()) {
      this.stream.write(`${config_command}\n`);
      output = await this.readUntilPrompt(this.config_prompt);
      this._checkError(config_command, output);
      if (!this.checkConfigMode()) {
        throw new Error('Failed to enter configuration mode.');
      }
    }
    return output;
  }

  async exitConfigMode(exit_command = 'end') {
    let output = '';
    if (this.checkConfigMode()) {
      this.stream.write(`${exit_command}\n`);
      output = await this.readUntilPrompt(this.prompt);
      this._checkError(exit_command, output);
      if (this.checkConfigMode()) {
        throw new Error('Failed to exit configuration mode.');
      }
    }
    return output;
  }

  async commit() {
    // This method is for transactional devices and does nothing by default.
    return '';
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

    // Commit if needed (for transactional devices)
    output += await this.commit();

    output += await this.exitConfigMode();
    return output;
  }

  async fileTransfer(source_file, dest_file, direction = 'put') {
    return new Promise((resolve, reject) => {
      this.client.sftp((sftpErr, sftp) => {
        if (sftpErr) {
          return reject(new Error(`SFTP session error: ${sftpErr.message}`));
        }

        const sftpError = (err) => {
          sftp.end();
          reject(new Error(`SFTP operation failed: ${err.message}`));
        };

        if (direction === 'put') {
          if (!fs.existsSync(source_file)) {
            return reject(new Error(`Source file not found: ${source_file}`));
          }
          const readStream = fs.createReadStream(source_file);
          const writeStream = sftp.createWriteStream(dest_file);
          writeStream.on('close', () => {
            sftp.end();
            resolve(`File ${source_file} uploaded to ${dest_file}`);
          }).on('error', sftpError);
          readStream.pipe(writeStream);
        } else if (direction === 'get') {
          const readStream = sftp.createReadStream(source_file);
          const writeStream = fs.createWriteStream(dest_file);
           writeStream.on('close', () => {
             sftp.end();
             resolve(`File ${source_file} downloaded to ${dest_file}`);
           }).on('error', sftpError);
          readStream.on('error', sftpError).pipe(writeStream);
        } else {
          sftp.end();
          reject(new Error('Invalid direction. Must be "put" or "get".'));
        }
      });
    });
  }
}
