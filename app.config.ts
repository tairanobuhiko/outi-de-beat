import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'outi-de-beat',
  slug: 'outi-de-beat',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#05060b'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.company.outidebeat',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: '自宅Wi-Fi接続時のみゲームをプレイできるようにSSIDを確認します。',
      NSBluetoothAlwaysUsageDescription: 'ハプティクス制御のためにBluetoothを利用する可能性があります。'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#05060b'
    }
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          newArchEnabled: false,
          useFrameworks: 'static'
        }
      }
    ]
  ]
};

export default config;
