import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pokemon.adventure.journey',
  appName: '宝可梦·一起冒险',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
