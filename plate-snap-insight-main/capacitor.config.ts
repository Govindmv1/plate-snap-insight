import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9fc4bf750a5248aa8a3286330d293035',
  appName: 'FoodScan AI',
  webDir: 'dist',
  server: {
    url: 'https://9fc4bf75-0a52-48aa-8a32-86330d293035.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      iosOverlay: true,
      androidOverlay: true,
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
