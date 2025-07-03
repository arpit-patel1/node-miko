const { ConnectHandler } = require('../src/connect_handler');
const { Client } = require('ssh2');
const { Duplex } = require('stream');
const EventEmitter = require('events');

jest.useFakeTimers();

// Mock the ssh2 library with an interactive test harness
jest.mock('ssh2', () => {
  class MockStream extends Duplex {
    _read() {}
    _write(chunk, encoding, callback) {
      const command = chunk.toString();
      // This state machine simulates a Cisco IOS device's responses
      if (command === 'enable\n') {
        this.push('Password:');
      } else if (command === 'secret\n') {
        this.push('Router#');
      } else if (command.startsWith('show version')) {
        this.push('show version\nCisco IOS Software, Version 15.1\nRouter#');
      } else if (command.startsWith('configure terminal')) {
        this.push('Router(config)#');
      } else if (command.startsWith('interface loopback0')) {
        this.push('Router(config-if)#');
      } else if (command.startsWith('ip address')) {
        this.push('Router(config-if)#');
      } else if (command.startsWith('end')) {
        this.push('Router#');
      }
      callback();
    }
  }
  const mStream = new MockStream();

  class MockClient extends EventEmitter {
    constructor() {
      super();
      this.connect = jest.fn(config => {
        setImmediate(() => this.emit('ready'));
      });
      this.shell = jest.fn(callback => {
        callback(null, mStream);
        // Push initial prompt after the shell is established.
        setImmediate(() => mStream.push('Router>'));
      });
      this.end = jest.fn();
    }
  }

  return {
    Client: jest.fn(() => new MockClient()),
  };
});


describe('CiscoIosConnection', () => {
  let client;

  beforeEach(() => {
    client = new Client();
    client.connect.mockClear();
    client.shell.mockClear();
    client.end.mockClear();
    client.removeAllListeners();
  });

  test('should connect, send command, send config, and disconnect', async () => {
    const device = {
      device_type: 'cisco_ios',
      host: '1.1.1.1',
      username: 'test',
      password: 'password',
      secret: 'secret',
    };

    const conn = await ConnectHandler(device);
    expect(client.connect).toHaveBeenCalledWith(expect.objectContaining({ host: '1.1.1.1' }));

    const showVersionOutput = 'Cisco IOS Software, Version 15.1';
    const showVersionResult = await conn.sendCommand('show version');
    expect(showVersionResult).toBe(showVersionOutput);

    const configCommands = ['interface loopback0', 'ip address 1.1.1.1 255.255.255.255'];
    await conn.sendConfig(configCommands);

    await conn.disconnect();
    expect(client.end).toHaveBeenCalled();
  });
});
