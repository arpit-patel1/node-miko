import { ConnectHandler } from '../src/connect_handler.js';
import { withConnection } from '../src/utils/withConnection.js';
import 'dotenv/config';

const device = {
  device_type: 'linux_ssh',
  host: process.env.LINUX_HOST,
  username: process.env.LINUX_USERNAME,
  password: process.env.LINUX_PASSWORD,
};

async function main(conn) {
  try {
    console.log('Successfully connected to Linux host.');

    console.log('Sending command: whoami');
    const whoami_output = await conn.sendCommand('whoami');
    console.log('Output from "whoami":', whoami_output);

    console.log('\\nSending command: ls -la');
    const ls_output = await conn.sendCommand('ls -la');
    console.log('Output from "ls -la":\\n---');
    console.log(ls_output);
    console.log('---');

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

withConnection(device, main); 