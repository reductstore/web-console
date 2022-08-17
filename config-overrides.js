module.exports = function override(config, env) {
  console.log("override");
  const loaders = config.resolve;
  loaders.fallback = {
    "fs": false,
    "tls": false,
    "net": false,
    "http": false,
    "https": false,
    "zlib": false,
    "path": false,
    "stream": require.resolve("stream-browserify"),
    "util": false,
    "crypto": false,
    "buffer": require.resolve("buffer/"),
  };

  return config;
};
