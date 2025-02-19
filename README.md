# IPTremio

⚠️ **EXPERIMENTAL PROJECT** - This project is currently in experimental phase. Use it at your own risk.

⚠️ **Legal Notice** This addon is for use with legal Xtream Codes playlists only. You are responsible for ensuring you have the right to access the content.

IPTremio is a Stremio addon for Xtream Codes playlists integration. It allows you to stream your IPTV content directly through Stremio.

Hosted on: [https://iptremio.click/configure](https://iptremio.click/configure)

## Features

- Seamless integration with Stremio
- Support for Xtream Codes playlists
- MongoDB integration for data persistence
- EPG (Electronic Program Guide) support
- TMDB integration for enhanced metadata

## Prerequisites

- Node.js 20 or higher
- MongoDB
- Docker (optional)

## Installation

### Using Docker

1. Clone the repository:
```bash
git clone https://github.com/iptremio/iptremio.git
cd iptremio
```

2. Build and run with Docker:
```bash
docker build -t iptremio .
docker run -p 7008:7008 iptremio
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/iptremio/iptremio.git
cd iptremio
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Configuration

The application can be configured using environment variables. Create a `.env` file in the root directory with the following options:

```env
# Server Configuration
PORT=7008                      # Server port (default: 7008)
BASE_URL=http://127.0.0.1:7008 # Base URL of the server
HOST=127.0.0.1                # Host address (default: 127.0.0.1)
NODE_ENV=development          # Environment (development/production)

# Features Configuration
EPG_ENABLED=true              # Enable/disable EPG functionality
DISABLE_EPG_PROCESSING=false  # Disable EPG processing if needed
IMG_PROXY=https://img.iptremio.click/  # Image proxy URL

# Database Configuration
MONGODB_URL=mongodb://localhost:27017/iptremio  # MongoDB connection URL
MONGODB_POOL_SIZE=20         # MongoDB connection pool size

# API Keys
TMDB_API_KEY=your_api_key    # TMDB API key for metadata
```

### Available Scripts

- `npm start` - Start the application in production mode
- `npm run dev` - Start the application in development mode with hot reload

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is experimental and under active development. Features may change or break without notice. Use in production environments is not recommended at this stage. 