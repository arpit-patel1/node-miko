const { ConnectHandler } = require('../src/connect_handler');
const { withConnection } = require('../src/utils/withConnection');
require('dotenv').config();

const device = {
  device_type: 'cisco_ios',
  host: process.env.CISCO_HOST,
  username: process.env.CISCO_USERNAME,
  password: process.env.CISCO_PASSWORD,
  secret: process.env.CISCO_SECRET,
  // Set a longer read timeout for the connection
  read_timeout: 30000,
};

async function copyFile(conn) {
  try {
    console.log('Entering enable mode...');
    await conn.enable();

    // This command will take a long time and requires interaction.
    const command = 'copy flash:test.bin flash:test-long.bin';
    console.log(`Sending long-running command: ${command}`);

    // The initial command will prompt for the destination filename.
    // We use sendCommandTiming and increase the timeout with delay_factor.
    let output = await conn.sendCommandTiming(command, {
      strip_prompt: false,
      strip_command: false,
      delay_factor: 4,
      expect_string: /Destination filename/,
    });

    console.log('--- Initial command output ---');
    console.log(output);
    console.log('--- End initial output ---');

    // Check if the confirmation prompt appeared.
    if (output.includes('Destination filename')) {
      console.log('Destination prompt detected. Sending confirmation (newline).');

      // Send a newline to confirm the destination filename using sendCommandTiming.
      // This part (the actual copy) is what takes a long time.
      // We wait for the final device prompt (#) to know it's done.
      output += await conn.sendCommandTiming('\\n', {
        strip_prompt: false,
        strip_command: false,
        delay_factor: 8, // Use a larger factor for the copy itself
        expect_string: conn.prompt, // Wait for the real prompt
      });

      console.log('\\n--- Final command output ---');
      console.log(output);
      console.log('--- End final output ---');
    }

    console.log('\\nFile copy operation finished.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

withConnection(device, copyFile); 