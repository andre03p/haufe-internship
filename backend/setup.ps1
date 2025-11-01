# Code Review System - Quick Setup Script
# Run this script in PowerShell to set up the backend

Write-Host "🚀 Code Review System - Backend Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ .env file created. Please update it with your settings." -ForegroundColor Green
        Write-Host "⚠️  Important: Update DATABASE_URL with your PostgreSQL credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ .env.example not found!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""

# Check if Ollama is installed
Write-Host "🔍 Checking Ollama installation..." -ForegroundColor Cyan
try {
    $ollamaVersion = ollama --version
    Write-Host "✅ Ollama is installed: $ollamaVersion" -ForegroundColor Green
    
    # Check if model is available
    Write-Host "🔍 Checking for llama3.2 model..." -ForegroundColor Cyan
    $models = ollama list
    if ($models -match "llama3.2") {
        Write-Host "✅ llama3.2 model is available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  llama3.2 model not found. Pulling it now..." -ForegroundColor Yellow
        ollama pull llama3.2:latest
        Write-Host "✅ Model pulled successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Ollama is not installed or not in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://ollama.com/download" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Generate Prisma Client
Write-Host "⚙️  Generating Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    Write-Host "   Make sure DATABASE_URL is set correctly in .env" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Run migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
Write-Host "⚠️  Make sure PostgreSQL is running and DATABASE_URL is correct!" -ForegroundColor Yellow
$confirm = Read-Host "Continue with migrations? (y/n)"
if ($confirm -eq "y") {
    npm run prisma:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations completed" -ForegroundColor Green
    } else {
        Write-Host "❌ Migrations failed" -ForegroundColor Red
        Write-Host "   Check your PostgreSQL connection and DATABASE_URL" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⏭️  Skipped migrations" -ForegroundColor Yellow
}

Write-Host ""

# Seed database
Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
$confirm = Read-Host "Seed default user? (y/n)"
if ($confirm -eq "y") {
    npm run prisma:seed
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeded" -ForegroundColor Green
    } else {
        Write-Host "❌ Seeding failed" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  Skipped seeding" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the server: npm run dev" -ForegroundColor White
Write-Host "2. Seed coding standards by making a POST request to: http://localhost:5000/api/standards/seed" -ForegroundColor White
Write-Host "3. Test the API: npm run test:api" -ForegroundColor White
Write-Host ""
Write-Host "📖 See README.md for full documentation" -ForegroundColor Cyan
