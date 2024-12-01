module.exports = {
  apps: [{
    name: "TTPlayer-LRC",
    script: './src/index.js',
    env: {
      NODE_ENV: "production",
      TTPLAYER_PORT: 9090
    },
    env_production: {
      NODE_ENV: "production",
      TTPLAYER_PORT: 9090
    },
    env_development: {
      NODE_ENV: "development",
      TTPLAYER_PORT: 9090
    }
  }]
}
