import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // The app id is the app's identity in the stores and on devices. It is kept
  // as it was so the rename does not create a second, separate app.
  appId: 'no.korpsfix.app',
  appName: 'ViStiller',
  webDir: 'capacitor-web',
  server: {
    url: 'https://vistiller.com',
    cleartext: false,
    // Keep navigation inside the app for both the apex and www host.
    allowNavigation: ['vistiller.com', 'www.vistiller.com'],
  },
};

export default config;