# Quick Start Guide

Get your code review system up and running in 5 minutes!

## Prerequisites Check

Before starting, make sure you have:

- [ ] Node.js (v18+) installed
- [ ] PostgreSQL (v14+) installed and running
- [ ] Ollama installed (from https://ollama.com/download)
- [ ] Git installed

## Quick Setup (5 Steps)

### 1. Run Setup Script

```powershell
cd backend
.\setup.ps1
```

This will:

- Create .env file
- Check prerequisites
- Install dependencies
- Generate Prisma client
- Run migrations
- Seed database

### 2. Update .env File

Open `backend/.env` and update if needed:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/code_review_db"
```

### 3. Pull Ollama Model

```powershell
ollama pull llama3.2:latest
```

### 4. Start the Server

```powershell
npm run dev
```

You should see:

```
Database connected
Server running on port 5000
```

### 5. Seed Coding Standards

**Option A - Using curl:**

```powershell
curl -X POST http://localhost:5000/api/standards/seed
```

**Option B - Using PowerShell:**

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/standards/seed" -Method POST
```

**Option C - Using Postman/Insomnia:**

- Method: POST
- URL: `http://localhost:5000/api/standards/seed`

---

## Test Your Setup

### Quick Health Check

```powershell
curl http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "llm": {
    "status": "ok",
    "message": "LLM service is ready",
    "model": "llama3.2:latest"
  }
}
```

### Run Full API Tests

```powershell
npm run test:api
```

This will test all endpoints and show you if everything works!

---

## First Code Review

### 1. Prepare Your Code

```powershell
# Go to your project
cd C:/path/to/your/project

# Make some changes and stage them
git add .
git status
```

### 2. Analyze with curl

```powershell
curl -X POST http://localhost:5000/api/reviews/analyze-staged `
  -H "Content-Type: application/json" `
  -d '{
    "repositoryPath": "C:/path/to/your/project",
    "userId": 1
  }'
```

### 3. Analyze with PowerShell

```powershell
$body = @{
    repositoryPath = "C:/Users/YourName/Projects/your-repo"
    userId = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/reviews/analyze-staged" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### 4. View Results

The response will include:

- Review ID
- Number of issues found
- Issue severity breakdown (Critical/Major/Minor)
- Estimated effort to fix
- Token usage
- Analysis time

---

## Common Issues

### "No staged changes found"

```powershell
cd your-project
git add .
```

### "Ollama not accessible"

```powershell
ollama list  # Check if Ollama is running
ollama pull llama3.2:latest  # Pull model if missing
```

### "Database connection failed"

- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

### Port already in use

Change PORT in .env to 5001 or another available port

---

## Next Steps

1. **View all reviews:**

   ```powershell
   curl "http://localhost:5000/api/reviews?userId=1"
   ```

2. **Get specific review:**

   ```powershell
   curl "http://localhost:5000/api/reviews/REVIEW_ID"
   ```

3. **View statistics:**

   ```powershell
   curl "http://localhost:5000/api/reviews/stats/1"
   ```

4. **View database:**
   ```powershell
   npm run prisma:studio
   ```

---

## Using with Frontend

If you have the frontend:

1. Make sure backend is running on port 5000
2. Update frontend .env with backend URL
3. Start frontend: `npm run dev`
4. Access at: http://localhost:5173

---

## Useful URLs

- **API Health:** http://localhost:5000/health
- **Prisma Studio:** http://localhost:5555 (run `npm run prisma:studio`)
- **Frontend:** http://localhost:5173 (if running)

---

## Documentation

For detailed information:

- 📖 **Full Documentation:** See `README.md`
- 🔧 **Troubleshooting:** See `TROUBLESHOOTING.md`
- 📝 **What Was Fixed:** See `FIXES.md`

---

## Quick Command Reference

```powershell
# Development
npm run dev              # Start server with auto-reload
npm run start            # Start server (production)

# Database
npm run prisma:studio    # Visual database browser
npm run prisma:migrate   # Run migrations
npm run prisma:generate  # Regenerate Prisma client

# Testing
npm run test:api         # Test all endpoints
curl http://localhost:5000/health  # Quick health check

# Ollama
ollama list             # List installed models
ollama pull llama3.2    # Pull model
ollama run llama3.2     # Test model interactively
```

---

## Default User Credentials

The seed script creates a default user:

- **User ID:** 1
- **Email:** developer@haufe.com
- **Name:** Default Developer

Use `userId: 1` in all API requests.

---

## Getting Help

1. Check the logs in your terminal
2. View `TROUBLESHOOTING.md` for solutions
3. Enable debug mode: Set `NODE_ENV=development` in .env
4. Check Prisma Studio to inspect database
5. Run health check to verify services

---

## Success Indicators

Your setup is working if:

- ✅ Health check returns `"status": "ok"`
- ✅ Server starts without errors
- ✅ Test API script completes successfully
- ✅ You can analyze a repository
- ✅ Issues are saved to database
- ✅ Prisma Studio shows data

---

Happy code reviewing! 🚀
