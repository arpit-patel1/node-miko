# nodemiko

A Node.js library for simplifying SSH connections to network devices, inspired by Python's `netmiko`.

## Why nodemiko?

Network automation in Node.js often requires manually handling SSH streams, prompts, and configuration modes. `nodemiko` aims to simplify this by providing a unified, promise-based API for sending commands and configuration changes to a variety of network vendors.

## Installation

```bash
npm install nodemiko
```

## Getting Started

First, require the `ConnectHandler` from the library.

```js
const { ConnectHandler } = require('nodemiko');
```

Next, create a device object. The `device_type` is mandatory and tells `nodemiko` which vendor driver to use. The following parameters are supported:

*   `device_type`: (Required) The type of device (e.g., `cisco_ios`).
*   `host`: (Required) The IP address or hostname.
*   `username`: (Required) The login username.
*   `password`: The login password (required if not using SSH keys).
*   `secret`: The enable/privileged mode password (optional).
*   `port`: The SSH port (optional, defaults to 22).
*   `conn_timeout`: Connection timeout in milliseconds (optional, defaults to 20000).
*   `read_timeout`: Read timeout in milliseconds (optional, defaults to 10000).
*   `global_delay_factor`: A multiplier for small delays between commands, useful for slow devices (optional, defaults to 1).
*   `use_keys`: Set to `true` to use SSH key authentication (optional).
*   `key_file`: Absolute path to your private key file (required if `use_keys` is true).
*   `passphrase`: The passphrase for your private key (optional).

## File Transfer

`nodemiko` supports file transfers to and from the remote device using SCP.

`connection.fileTransfer(source_file, dest_file, direction)`

*   `source_file` (string): The path to the source file.
*   `dest_file` (string): The path to the destination file.
*   `direction` (string): The direction of transfer. Can be `'put'` (to the device) or `'get'` (from the device). Defaults to `'put'`.

### Example: Uploading a file

```js
const task = async (conn) => {
  try {
    const result = await conn.fileTransfer('local_config.txt', 'flash:backup_config.txt', 'put');
    console.log(result);
  } catch (error) {
    console.error('File upload failed:', error);
  }
};
```

Now, you can connect to the device and start sending commands.

### Example: Sending Show Commands and Configuration

This example shows how to connect to a Cisco IOS device, run a `show` command, send a couple of configuration lines, and then disconnect. It uses the `withConnection` handler to ensure the connection is always closed.

```js
const { withConnection } = require('nodemiko');

// Replace with your device's details
const device_options = {
  device_type: 'cisco_ios',
  host: '10.0.0.1',
  username: 'admin',
  password: 'password',
  secret: 'enable_secret',
  port: 22,
  conn_timeout: 10000,
  read_timeout: 10000,
  use_keys: false,
  key_file: '',
  passphrase: '',
};

const myTask = async (conn) => {
  // Send a single command
  console.log('Fetching interface brief...');
  const int_brief = await conn.sendCommand('show ip int br');
  console.log(int_brief);

  // Send a set of configuration commands
  console.log('Sending configuration...');
  const config_commands = [
    'no ip domain-lookup',
    'logging buffered 20000'
  ];
  const config_output = await conn.sendConfig(config_commands);
  console.log(config_output);
};

(async () => {
  try {
    await withConnection(device_options, myTask);
    console.log('Task complete. Connection closed automatically.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
})();
```

## Supported Platforms

Currently, the supported platforms are:
*   `cisco_ios`
*   `cisco_nxos`
*   `cisco_xr`
*   `juniper_junos`

The library is designed to be easily extensible to other vendors.

## Acknowledgements

This project is heavily inspired by the fantastic Python library `netmiko`, created by Kirk Byers. The goal of `nodemiko` is to provide a similar, easy-to-use interface for network automation in the Node.js ecosystem.

A huge thank you to Kirk for his pioneering work in this space.

-   `netmiko` on GitHub: [https://github.com/ktbyers/netmiko](https://github.com/ktbyers/netmiko)

## Contributing

Contributions are welcome! If you'd like to add a new device type or fix a bug, please open an issue or pull request.

## New Features

`sendCommand(command, options={})`
Sends a command to the device and waits for the prompt.

*   `command` (string): The command to send.
*   `options` (object):
    *   `expect_string` (RegExp): A regex pattern for a custom prompt or string to wait for.
    *   `strip_prompt` (boolean): Whether to strip the prompt from the output (default: `true`).
    *   `strip_command` (boolean): Whether to strip the command from the output (default: `true`).

**Example (Interactive Command):**
```javascript
// This command requires confirmation.
const output = await conn.sendCommand('clear logging', {
  expect_string: /\[confirm\]/,
  strip_prompt: false, 
});

if (output.includes('[confirm]')) {
  // Send 'y' to confirm.
  await conn.sendCommand('y');
}
```

**Example (Linux `sudo`):**
This example robustly handles `sudo` whether a password is required or not.
```javascript
const sudoCommand = 'sudo whoami';

// Expect either a password prompt OR the normal shell prompt.
const passwordPromptRegex = /[pP]assword:/;
const combinedPromptRegex = new RegExp(`(?:${passwordPromptRegex.source})|(?:${conn.prompt.source})`);

const output = await conn.sendCommand(sudoCommand, {
  expect_string: combinedPromptRegex,
});

// If the password prompt was detected, send the password.
if (output.match(passwordPromptRegex)) {
  const sudoOutput = await conn.sendCommand(device.password);
  console.log(sudoOutput); // Should be 'root'
} else {
  // Otherwise, the output is already in the first response.
  console.log(output); // Should be 'root'
}
```

`sendCommandTiming(command, options={})`
Similar to `sendCommand`, but designed for commands that take a long time to complete. It includes a `delay_factor` option to extend the timeout.

*   `delay_factor` (number): Multiplies the base `read_timeout` to allow for longer execution times. Default: `1`.

`sendConfig(config_commands)`
Sends a list of configuration commands to the device.

## API

### `ConnectHandler(device)`
The main entry point for creating a connection.

### `BaseConnection`
The base class for all device types.

**Properties:**
*   `prompt` (RegExp): The detected command prompt.

**Methods:**
*   `connect()`: Establishes the SSH connection.
*   `disconnect()`: Closes the SSH connection.
*   `find_prompt()`: Automatically detects the command prompt of the device. This is called automatically on connect and after entering enable mode.
*   `enable()`: Enters enable (privileged) mode.
*   `sendCommand(command, options={})`: Sends a command to the device.
*   `sendCommandTiming(command, options={})`: Sends a long-running command, with an adjustable timeout.
*   `sendConfig(config_commands)`: Sends a list of configuration commands.
*   `fileTransfer(source_file, dest_file, direction='put')`: Transfers a file to/from the device using SFTP.