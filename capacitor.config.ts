import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.korpsfix.app',
  appName: 'korpsfix',
  webDir: 'capacitor-web',
  server: {
  url: 'https://korpsfix.vercel.app',
  cleartext: false,
},
};

export default config;