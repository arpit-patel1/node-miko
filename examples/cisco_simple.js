const { withConnection } = require('../src/connect_handler');
const fs = require('fs');
const path = require('path');

// Replace with your device's details
const device_options_password = {
  device_type: 'cisco_ios',
  host: '10.0.0.1',
  username: 'admin',
  password: 'password', // Can be removed if using keys
  secret: 'enable_secret',
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

    // Send a set of configuration commands
    console.log('Sending configuration...');
    const config_commands = [
      'no ip domain-lookup',
      'logging buffered 20000',
    ];
    const config_output = await conn.sendConfig(config_commands);
    console.log(config_output);

    // --- File Transfer Example ---
    console.log('\nStarting file transfer example...');
    const local_file = 'test_file.txt';
    // Note: The remote path might need to be adjusted based on the device's filesystem.
    // For many Cisco devices, this will be 'flash:' or 'bootflash:'.
    const remote_file = 'test_file.txt';

    // 1. Create a dummy local file to upload
    fs.writeFileSync(local_file, 'This is a test file for nodemiko.\n');
    console.log(`Created dummy file: ${local_file}`);

    // 2. Upload the file (put)
    try {
      const put_result = await conn.fileTransfer(local_file, remote_file, 'put');
      console.log(put_result);
    } catch (error) {
      console.error(`File upload failed: ${error.message}`);
    }

    // 3. Download the file (get)
    const download_path = path.join(__dirname, 'downloaded_file.txt');
    try {
      const get_result = await conn.fileTransfer(remote_file, download_path, 'get');
      console.log(get_result);
      console.log(`Downloaded file content: ${fs.readFileSync(download_path, 'utf-8')}`);
    } catch (error) {
      console.error(`File download failed: ${error.message}`);
    }

    // 4. Cleanup local files
    fs.unlinkSync(local_file);
    fs.unlinkSync(download_path);
    console.log('Cleaned up local files.');
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
