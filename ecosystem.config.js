const PM2_INSTANCES = process.env.PM2_INSTANCES || 2;
const PM2_MAX_MEMORY = process.env.PM2_MAX_MEMORY || '550M';
const MONGODB_POOL_SIZE_PROD = 20;
const MONGODB_POOL_SIZE_DEV = 10;

module.exports = {
  apps: [{
    name: 'xstremio',
    script: 'src/index.js',
    instances: PM2_INSTANCES,
    exec_mode: 'cluster',
    max_memory_restart: PM2_MAX_MEMORY,
    env: {
      NODE_ENV: 'production',
      MONGODB_POOL_SIZE: MONGODB_POOL_SIZE_PROD // MongoDB pool size for production
    },
    env_development: {
      NODE_ENV: 'development',
      MONGODB_POOL_SIZE: MONGODB_POOL_SIZE_DEV // MongoDB pool size for development
    }
  }]
}
