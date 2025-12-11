#!/bin/bash
set -e

echo "🚀 Starting TwelveLabs Voice Transcription App..."

# Create log directories
mkdir -p /var/log/nginx
mkdir -p /var/log/backend
mkdir -p /var/log/supervisor

# Check if required environment variables are set
if [ -z "$ELEVENLABS_API_KEY" ]; then
    echo "⚠️  WARNING: ELEVENLABS_API_KEY is not set!"
fi

# Test backend dependencies
echo "📦 Testing backend dependencies..."
python3 -c "import fastapi, uvicorn, elevenlabs" || {
    echo "❌ Backend dependencies missing!"
    exit 1
}

echo "✅ Backend dependencies OK"

# Start supervisor (will start nginx and backend)
echo "🎬 Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
