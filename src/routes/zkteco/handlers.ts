// import Zkteco from 'zkteco-js';

import type { AppRouteHandler } from '@/lib/types';

import ZKLib from 'zklib-js';

import type { ListRoute } from './routes';

const options = {
  ip: '192.168.10.23',
  port: 4370,
  timeout: 10000,
  inport: 5520,
};

// ! zkteco-js
// export async function manageZktecoDevice() {
//   const device = new Zkteco(options.ip, options.port, options.timeout, options.inport);
//   console.warn(device);
//   try {
//     await device.createSocket();
//     console.warn('Connected to device');
//     // Add your device interaction logic here
//     if (typeof device.disconnect === 'function') {
//       await device.disconnect();
//     }
//   }
//   catch (error) {
//     console.error('Error:', error);
//   }
//   finally {
//     if (typeof device.disconnect === 'function') {
//       try {
//         await device.disconnect();
//       }
//       catch {}
//     }
//   }
// }

// ! zklib-js
export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const device = new ZKLib(options.ip, options.port, options.timeout, options.inport);
  console.warn(device);
  let allUser: any[] = [];
  try {
    await device.createSocket();

    console.warn('Connected to device');

    allUser = await device.getUsers();
  }
  catch (error) {
    console.error('Error:', error);
    // Optionally, return an error response here
    return c.json({ error: 'Failed to fetch all users' }, 500);
  }
  finally {
    if (typeof device.disconnect === 'function') {
      try {
        await device.disconnect();
      }
      catch {}
    }
  }
  // Return the allUser as a JSON response with status 200
  return c.json(allUser, 200);
};
