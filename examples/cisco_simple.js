import { ConnectHandler } from '../src/connect_handler.js';
import { withConnection } from '../src/utils/withConnection.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Replace with your device's details
const device_options_password = {
  device_type: 'cisco_ios',
  host: 'sandbox-iosxr-1.cisco.com',
  username: 'admin',
  password: 'C1sco12345', // Can be removed if using keys
  secret: 'C1sco12345',
  port: 22,
  conn_timeout: 20000,
  read_timeout: 10000,
  global_delay_factor: 1, // optional: multiplier for delays
};

// --- OR ---

// Example for SSH Key Authentication
/*
const device_options_key = {
  device_type: 'cisco_ios',
  host: '10.0.0.1',
  username: 'admin',
  use_keys: true,
  key_file: '/path/to/your/private_key', // e.g., /Users/user/.ssh/id_rsa
  passphrase: 'your-key-passphrase', // optional
  secret: 'enable_secret',
  port: 22,
  global_delay_factor: 1, // optional: multiplier for delays
};
*/

const main = async () => {
  const task = async (conn) => {
    // Send a single command
    console.log('Fetching interface brief...');
    const int_brief = await conn.sendCommand('show ip int br');
    console.log(int_brief);

    console.log('Fetching version...');
    const version = await conn.sendCommand('show version');
    console.log(version);

    console.log('\\nChecking available filesystems...');
    const filesystems = await conn.sendCommand('show filesystem');
    console.log(filesystems);

    // --- File Transfer Example ---
    console.log('\\nStarting file transfer example...');
    const local_file = 'test_file.txt';
    // NOTE: You must specify a writable filesystem on the remote device.
    // Common filesystems include 'flash:', 'disk0:', 'harddisk:'.
    // This will vary depending on the platform.
    const remote_file = 'disk0:/nodemiko_test_file.txt';
    fs.writeFileSync(local_file, 'This is a test file for nodemiko.');
    console.log(`Created dummy file: ${local_file}`);

    // 2. Upload the file (put)
    try {
      const put_result = await conn.fileTransfer(local_file, remote_file, 'put');
      console.log(put_result);
    } catch (error) {
      console.error(`File upload failed: ${error.message}`);
    }

    // 3. Download the file (get)
    try {
      const downloaded_local_file = 'downloaded_file.txt';
      const download_result = await conn.fileTransfer(remote_file, downloaded_local_file, 'get');
      console.log(download_result);
    } catch (e) {
      console.error(`File download failed: ${e.message}`);
    }

    // 4. Cleanup local files
    fs.unlinkSync(local_file);
    if (fs.existsSync('downloaded_file.txt')) {
      fs.unlinkSync('downloaded_file.txt');
    }
    console.log('Cleaned up local files.');

    // Try to remove the file from the remote device
    try {
      await conn.sendCommand(`delete ${remote_file}`, {
        expect_string: /Delete/i,
      });
      // Confirm deletion
      await conn.sendCommand('\n');
      console.log('Cleaned up remote file.');
    } catch (e) {
      console.log('Could not automatically clean up remote file. Please remove it manually.');
    }
  };

  try {
    // Change to `device_options_key` to test key-based auth
    await withConnection(device_options_password, task);
    console.log('Task complete. Connection closed automatically.');
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

main();
