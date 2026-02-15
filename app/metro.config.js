// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add path alias support
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// Mock native-only modules for web platform
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // better-sqlite3 is a Node.js native module used by WatermelonDB's sqlite-node adapter.
  // It's not available in web bundles, so we provide an empty module.
  if (platform === 'web' && moduleName === 'better-sqlite3') {
    return {
      type: 'empty',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
