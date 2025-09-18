import Zkteco from 'zkteco-js';

const options = {
  ip: '192.168.1.112',
  port: 4370,
  timeout: 5000,
  inport: 115200,
};

// ! zkteco-js
export async function manageZktecoDevice() {
  const device = new Zkteco(options.ip, options.port, options.timeout, options.inport);
  console.warn(device);
  try {
    await device.createSocket();
    console.warn('Connected to device');
    // Add your device interaction logic here
    if (typeof device.disconnect === 'function') {
      await device.disconnect();
    }
  }
  catch (error) {
    console.error('Error:', error);
  }
  finally {
    if (typeof device.disconnect === 'function') {
      try {
        await device.disconnect();
      }
      catch {}
    }
  }
}
