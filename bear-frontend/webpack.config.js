const path = require('path');

module.exports = {
  // Disable source maps in production
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  
  // Custom webpack configuration
  configure: (webpackConfig, { env, paths }) => {
    if (env === 'production') {
      // Remove source map references
      webpackConfig.devtool = false;
      
      // Obfuscate module names
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      
      // Hide source files from network tab
      webpackConfig.output = {
        ...webpackConfig.output,
        filename: 'static/js/[name].[contenthash:8].js',
        chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
      };
    }
    
    return webpackConfig;
  },
};
