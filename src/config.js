const config = {
    // Port on which the server will run
    PORT: process.env.PORT || 7008,
    
    // Base URL of the server
    BASE_URL: process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 7008}`,
    
    // Host address of the server
    HOST: process.env.HOST || '127.0.0.1',
    
    // Flag to check if the environment is development
    isDev: process.env.NODE_ENV === 'development',
    
    // Flag to enable or disable EPG (Electronic Program Guide)
    EPG_ENABLED: process.env.EPG_ENABLED !== 'false',
    
    // Proxy URL for images
    IMG_PROXY: process.env.IMG_PROXY || 'https://img.iptremio.click/',//'https://api.allorigins.win/raw?url=',
    
    // MongoDB connection URL
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017/iptremio',
    
    // MongoDB connection pool size
    MONGODB_POOL_SIZE: process.env.MONGODB_POOL_SIZE || 20,
    
    // Flag to disable EPG processing
    DISABLE_EPG_PROCESSING: process.env.DISABLE_EPG_PROCESSING === 'true',

    TMDB_API_KEY: process.env.TMDB_API_KEY,
}

module.exports = config
