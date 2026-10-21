module.exports = {
  apps: [
    {
      name: "unama-jadwal-sync",
      cwd: "./apps/scrapper",
      script: "src/daemon.ts",
      interpreter: "bun",
      watch: false,
      max_memory_restart: "300M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
