/* eslint-disable unicorn/filename-case */
declare module 'zkteco-js' {
  export default class Zkteco {
    constructor(ip: string, port: number, timeout?: number, inport?: number);
    createSocket(): Promise<void>;
    getAttendances(): Promise<any[]>;
    getRealTimeLogs(callback: (log: any) => void): Promise<void>;
    disconnect(): Promise<void>;
    setUser(
      uid: number,
      userid: string,
      name: string,
      inport: string,
      role?: number,
      cardno?: number
    ): Promise<any>;
    getUsers(): Promise<any[]>;
    getUser(uid: number): Promise<any>;
    deleteUser(uid: number): Promise<any>;
    // Add more methods as needed from the library
  }
}
