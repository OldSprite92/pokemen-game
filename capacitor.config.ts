import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokemon.adventure',
  appName: '宝可梦大冒险',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
