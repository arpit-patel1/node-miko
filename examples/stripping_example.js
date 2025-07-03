import { ConnectHandler } from '../src/connect_handler.js';
import { withConnection } from '../src/utils/withConnection.js';
import 'dotenv/config';

const device = {
  device_type: 'cisco_ios',
  host: process.env.CISCO_HOST,
  username: process.env.CISCO_USERNAME,
  password: process.env.CISCO_PASSWORD,
  secret: process.env.CISCO_SECRET,
};

async function showStripping(conn) {
  try {
    console.log('Entering enable mode...');
    await conn.enable();
    console.log('Successfully entered enable mode.');

    const command = 'show ip interface brief';

    console.log('\\n--- 1. Default Behavior (Stripping Enabled) ---');
    const cleanOutput = await conn.sendCommand(command);
    console.log(`Command: ${command}`);
    console.log('Output:');
    console.log(cleanOutput);
    console.log('--- END ---');


    console.log('\\n--- 2. Stripping Disabled ---');
    const rawOutput = await conn.sendCommand(command, {
      strip_command: false,
      strip_prompt: false,
    });
    console.log(`Command: ${command}`);
    console.log('Raw Output:');
    console.log(rawOutput);
    console.log('--- END ---');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

withConnection(device, showStripping); 