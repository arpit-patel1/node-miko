const { ConnectHandler } = require('../src/connect_handler');
const { withConnection } = require('../src/utils/withConnection');
require('dotenv').config();

const device = {
  device_type: 'cisco_ios',
  host: process.env.CISCO_HOST,
  username: process.env.CISCO_USERNAME,
  password: process.env.CISCO_PASSWORD,
  secret: process.env.CISCO_SECRET, // Enable password
};

async function clearLogging(conn) {
  try {
    console.log('Entering enable mode...');
    await conn.enable();
    console.log('Successfully entered enable mode.');

    // This command requires confirmation.
    console.log("Sending 'clear logging' command...");
    // We expect a confirmation prompt, so we set 'expect_string'
    const output = await conn.sendCommand('clear logging', {
      expect_string: /\[confirm\]/,
      strip_prompt: false, // We want to see the confirmation prompt
    });

    console.log(`Output from 'clear logging':\n---\n${output}\n---`);

    // Check if confirmation is required
    if (output.includes('[confirm]')) {
      console.log("Confirmation required. Sending 'y'...");
      // Send 'y' to confirm. The device will then return to the normal prompt.
      const confirmOutput = await conn.sendCommand('y');
      console.log(
        `Output after confirmation:\n---\n${confirmOutput}\n---`
      );
    } else {
      console.log('No confirmation was required.');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

withConnection(device, clearLogging); 