const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo root
config.watchFolders = [workspaceRoot];

// 2. Let Metro search for modules in both the project node_modules and monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve relative paths inside packages
config.resolver.disableHierarchicalLookup = true;

// 4. Intercept react-native shims removed/changed in 0.86.0 and redirect to compatible modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native/Libraries/Renderer/shims/ReactNative') {
    return context.resolveRequest(context, 'react-native', platform);
  }
  if (moduleName === 'react-native/Libraries/WebSocket/WebSocket') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(projectRoot, 'src/lib/webSocketShim.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
