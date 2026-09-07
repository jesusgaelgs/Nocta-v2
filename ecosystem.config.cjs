/**
 * Config para PM2 (proceso de producción en el servidor Dell).
 * Uso:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup          # para arrancar al reiniciar el servidor
 */
module.exports = {
  apps: [
    {
      name: "nocta",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
