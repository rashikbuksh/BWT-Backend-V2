import type { AppRouteHandler } from '@/lib/types';

import ZKLib from 'zklib-js';

// import ZKLib from 'zklib-js';
// import Zkteco from 'zkteco-js';
// import { device } from '@/utils/zkteco';
import type { ListRoute } from './routes';

const options = {
  ip: '192.168.10.9',
  port: 4370,
  timeout: 10000,
  inport: 5520,
};

// ! zkteco-js
// export const list: AppRouteHandler<ListRoute> = async (c: any) => {
//   const device = new Zkteco(options.ip, options.port, options.timeout, options.inport);
//   console.warn(device);
//   let allUser: any[] = [];
//   try {
//     await device.createSocket();

//     console.warn('Connected to device');

//     allUser = await device.getUsers();

//     console.log(allUser, 'Users fetched successfully');
//   }
//   catch (error) {
//     console.error('Error:', error);
//     // Optionally, return an error response here
//     return c.json({ error: 'Failed to fetch all users' }, 500);
//   }
//   finally {
//     if (typeof device.disconnect === 'function') {
//       try {
//         await device.disconnect();
//       }
//       catch {}
//     }
//   }
//   // Return the allUser as a JSON response with status 200
//   return c.json(allUser, 200);
// };

// ! zklib-js
export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  await test();
  return c.json({ message: 'YOOO' }, 200);
};

async function test() {
  const zkInstance = new ZKLib(options.ip, 4370, 0, options.inport);

  console.warn('Creating socket to device...');
  await zkInstance?.createSocket();
  console.warn('Socket created successfully');

  try {
    // Create socket to machine

    // Get general info
    console.warn('Fetching device info...');
    console.log(await zkInstance.getInfo());

    // Get users in machine
    console.warn('Fetching users from device...');
    const users = await zkInstance?.getUsers();
    console.log(users);

    // Get attendance logs
    const logs = await zkInstance?.getAttendances();
    console.log(logs);

    // Disconnect
    await zkInstance.disconnect();
  }
  catch (e) {
    console.log(e);
  }
}
