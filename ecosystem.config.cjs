module.exports = {
  apps: [
    {
      name: 'discord-steam-preview',
      script: 'dist/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
