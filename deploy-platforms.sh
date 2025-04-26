#!/bin/bash

# Function to display usage
show_usage() {
    echo "Usage: ./deploy-platforms.sh [platform]"
    echo "Available platforms:"
    echo "  railway - Deploy to Railway.app"
    echo "  render  - Deploy to Render.com"
    echo "  heroku  - Deploy to Heroku"
    echo "  local   - Deploy locally using Docker"
}

# Check if platform argument is provided
if [ -z "$1" ]; then
    show_usage
    exit 1
fi

# Deploy based on platform
case "$1" in
    "railway")
        # Install Railway CLI if not installed
        if ! command -v railway &> /dev/null; then
            npm i -g @railway/cli
        fi
        railway up
        ;;
        
    "render")
        echo "Please use Render.com dashboard and connect your GitHub repository"
        echo "1. Create a new Web Service"
        echo "2. Connect your repository"
        echo "3. Use 'Docker' as environment"
        echo "4. Add your environment variables"
        ;;
        
    "heroku")
        # Install Heroku CLI if not installed
        if ! command -v heroku &> /dev/null; then
            curl https://cli-assets.heroku.com/install.sh | sh
        fi
        heroku container:login
        heroku create
        heroku container:push web
        heroku container:release web
        ;;
        
    "local")
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo "Docker is not installed. Please install Docker first."
            exit 1
        fi
        docker-compose up -d
        ;;
        
    *)
        echo "Invalid platform specified"
        show_usage
        exit 1
        ;;
esac 