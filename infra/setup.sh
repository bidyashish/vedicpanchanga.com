#!/bin/bash

# Drik Panchanga - Quick Setup Script
# This script sets up and runs both backend and frontend

echo "🕉️  Drik Panchanga Setup"
echo "======================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# Backend Setup
echo -e "\n${YELLOW}Setting up Backend...${NC}"
cd ../backend || exit

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Backend setup complete${NC}"

# Frontend Setup
echo -e "\n${YELLOW}Setting up Frontend...${NC}"
cd ../frontend || exit

# Install Node dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating environment file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8121" > .env.local
fi

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# Start both servers
echo -e "\n${YELLOW}Starting servers...${NC}"
echo "Backend: http://localhost:8121 (API docs: http://localhost:8121/docs)"
echo "Frontend: http://localhost:3121"
echo -e "\nPress Ctrl+C to stop both servers\n"

# Function to kill both processes on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT

# Start backend
cd ../backend
source venv/bin/activate
python api.py &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID