import {
  deleteFile as originalDeleteFile,
  insertFile as originalInsertFile,
  updateFile as originalUpdateFile,
} from 'local-file-upload';

import env from '../env';

const isDev = env.NODE_ENV === 'development';
const isVps = env.NODE_ENV === 'vps';

const uploadDirectory = isDev ? './src/' : isVps ? './dist/src/' : './';

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await originalDeleteFile(filePath, uploadDirectory);
  }
  catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

export async function insertFile(file: any, folderName: string): Promise<string> {
  try {
    return await originalInsertFile(file, folderName, uploadDirectory);
  }
  catch (error) {
    console.error('Error inserting file:', error);
    throw error;
  }
}

export async function updateFile(file: any, oldFilePath: string, folderName: string): Promise<string> {
  try {
    return await originalUpdateFile(file, oldFilePath, folderName, uploadDirectory);
  }
  catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
}
