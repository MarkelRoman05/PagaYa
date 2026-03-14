import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAP_SERVER_URL;
const webDir = process.env.CAP_WEB_DIR ?? 'public';

const config: CapacitorConfig = {
  appId: 'com.markel.pagaya',
  appName: 'PagaYa',
  webDir,
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://')
      }
    : undefined
};

export default config;
