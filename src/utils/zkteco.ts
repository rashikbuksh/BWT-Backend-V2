// import Zkteco from 'zkteco-js';

import ZKLib from 'zklib-js';

const options = {
  ip: '192.168.10.9',
  port: 4370,
  timeout: 10000,
  inport: 5520,
};

export const device = new ZKLib(options.ip, options.port, 0, options.inport);
// ! zkteco-js
// export async function manageZktecoDevice() {
//   const device = new Zkteco(options.ip, options.port, options.inport, options.timeout);
//   console.warn(device);
//   try {
//     // Create the socket connection
//     await device.createSocket();

//     // Get attendance logs
//     const attendanceLogs = await device.getAttendances();
//     console.log(attendanceLogs);

//     // Listen for real-time logs
//     await device.getRealTimeLogs((realTimeLog) => {
//       console.log(realTimeLog);
//     });

//     // Disconnect after use
//     await device.disconnect();
//   }
//   catch (error) {
//     console.error('Error:', error);
//   }
// }

// ! zklib-js
export async function manageZktecoDevice() {
  // console.warn(device);
  try {
    console.warn('Connecting to device...');
    await device?.createSocket();
    console.warn('Connected to device');

    // Add your device interaction logic here
    const attendances = await device?.getAttendances();
    console.warn('Attendances:', attendances);
  }
  catch (error) {
    console.error('Error:', error);
  }
}
