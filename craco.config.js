const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { paths }) => {
      // Fix for exclamation mark (!) in directory name
      // Webpack doesn't allow ! in paths because it's reserved for loader syntax
      
      // Convert paths to absolute paths to avoid webpack parsing issues
      const fixPath = (pathValue) => {
        if (typeof pathValue === 'string') {
          // Use path.resolve to normalize and handle special characters
          return path.resolve(pathValue);
        }
        return pathValue;
      };

      // Fix output path
      if (webpackConfig.output) {
        if (webpackConfig.output.path) {
          webpackConfig.output.path = fixPath(webpackConfig.output.path);
        }
      }

      // Fix module rules - handle include/exclude paths
      if (webpackConfig.module && webpackConfig.module.rules) {
        const processRule = (rule) => {
          if (rule.include) {
            if (Array.isArray(rule.include)) {
              rule.include = rule.include.map(fixPath);
            } else if (typeof rule.include === 'string') {
              rule.include = fixPath(rule.include);
            }
          }
          if (rule.exclude) {
            if (Array.isArray(rule.exclude)) {
              rule.exclude = rule.exclude.map(fixPath);
            } else if (typeof rule.exclude === 'string') {
              rule.exclude = fixPath(rule.exclude);
            }
          }
          if (rule.oneOf) {
            rule.oneOf.forEach(processRule);
          }
        };

        webpackConfig.module.rules.forEach(processRule);
      }

      // Fix resolve paths
      if (webpackConfig.resolve) {
        if (webpackConfig.resolve.modules) {
          webpackConfig.resolve.modules = webpackConfig.resolve.modules.map(fixPath);
        }
        
        // Add path aliases for absolute imports to bypass "!" directory error
        if (!webpackConfig.resolve.alias) {
          webpackConfig.resolve.alias = {};
        }
        webpackConfig.resolve.alias['@'] = path.resolve(__dirname, 'src');
        webpackConfig.resolve.alias['@components'] = path.resolve(__dirname, 'src/components');
      }

      return webpackConfig;
    }
  },
  // Fix Connection Refused (3001): Use 127.0.0.1 instead of localhost for Windows
  devServer: {
    host: '127.0.0.1',
    port: 3001,
    open: false
  },
  // Disable source maps to avoid path issues
  eslint: {
    enable: false
  }
};
