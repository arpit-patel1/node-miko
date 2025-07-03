const { ConnectHandler } = require('../src/connect_handler');

// This is an example script. Replace these values with the details of a real
// or virtual device you can connect to.
const device_options = {
  device_type: 'cisco_ios',
  host: '10.0.0.1', // REPLACE with your device's IP or hostname
  username: 'admin',      // REPLACE with your username
  password: 'password',  // REPLACE with your password
  secret: 'enable_secret', // REPLACE with your enable secret
};

(async () => {
  if (device_options.host === '10.0.0.1') {
    console.log('Please update the device_options in examples/cisco_simple.js before running.');
    return;
  }

  try {
    // Establish connection and enter enable mode
    console.log(`Connecting to ${device_options.host}...`);
    const conn = await ConnectHandler(device_options);
    console.log('Connection successful!');

    // Send a single command
    console.log('\nFetching interface brief...');
    const int_brief = await conn.sendCommand('show ip int br');
    console.log(int_brief);

    // Send a set of configuration commands
    console.log('\nSending configuration...');
    const config_commands = [
      'no ip domain-lookup', 
      'logging buffered 20000'
    ];
    const config_output = await conn.sendConfig(config_commands);
    console.log('Configuration output:');
    console.log(config_output);

    // Disconnect from the device
    await conn.disconnect();
    console.log('\nDisconnected.');

  } catch (error) {
    console.error('\nAn error occurred:', error);
  }
})();
