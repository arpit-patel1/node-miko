import { ConnectHandler } from '../src/connect_handler.js';
import { withConnection } from '../src/utils/withConnection.js';
import 'dotenv/config';

const device = {
  device_type: 'linux_ssh',
  host: process.env.LINUX_HOST,
  username: process.env.LINUX_USERNAME,
  password: process.env.LINUX_PASSWORD, // This password will also be used for sudo
};

async function runSudoCommand(conn) {
  try {
    console.log('Successfully connected to Linux host.');

    const sudoCommand = 'sudo whoami';
    console.log(`Sending command: ${sudoCommand}`);

    // We need to expect either the password prompt OR the regular shell prompt.
    // This handles the case where sudo doesn't ask for a password.
    const passwordPromptRegex = /[pP]assword:/;
    const combinedPromptRegex = new RegExp(`(?:${passwordPromptRegex.source})|(?:${conn.prompt.source})`);


    // Send the sudo command and expect either a password prompt or the regular prompt.
    const output = await conn.sendCommand(sudoCommand, {
      expect_string: combinedPromptRegex,
      strip_prompt: false, // We want to see the prompt in the output
    });

    console.log(`Output from initial sudo command:\n---\n${output}\n---`);

    // Check if the password prompt was received
    if (output.match(passwordPromptRegex)) {
      console.log('Password prompt detected. Sending password...');
      // The user's login password is used for sudo
      const sudoOutput = await conn.sendCommand(device.password);
      console.log('Output after sending password:\n---');
      console.log(sudoOutput);
      console.log('---');

      // Verify the command worked
      if (sudoOutput.trim() === 'root') {
        console.log('\\nSudo command executed successfully!');
      } else {
        console.log('\\nSudo command failed.');
      }
    } else {
      console.log('No password prompt detected. Checking command output...');
      // The command ran without a password prompt. The output is the result.
      if (output.trim() === 'root') {
        console.log('\\nSudo command executed successfully!');
      } else {
        console.log('\\nSudo command may have failed. Output:', output);
      }
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

withConnection(device, runSudoCommand); 