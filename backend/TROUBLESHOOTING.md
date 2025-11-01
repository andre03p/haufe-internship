# Troubleshooting Guide

## Common Issues and Solutions

### 1. "No staged changes found" Error

**Problem:** When calling `/api/reviews/analyze-staged`, you get an error saying no staged changes are found.

**Solutions:**

- Make sure you're in a Git repository
- Stage your changes first:
  ```powershell
  cd your-repository
  git add .
  git status  # Verify files are staged
  ```
- Alternatively, the API will analyze modified files if nothing is staged

### 2. "Ollama is not running or not accessible"

**Problem:** Health check fails or analysis returns Ollama connection errors.

**Solutions:**

1. Check if Ollama is installed:

   ```powershell
   ollama --version
   ```

2. Check if Ollama service is running:

   ```powershell
   ollama list
   ```

3. If not running, restart your computer (Ollama starts automatically)

4. Verify the model is available:

   ```powershell
   ollama pull llama3.2:latest
   ollama list
   ```

5. Check OLLAMA_HOST in .env (default: http://127.0.0.1:11434)

### 3. Database Connection Failed

**Problem:** "Database connection failed" or Prisma errors.

**Solutions:**

1. Verify PostgreSQL is running:

   ```powershell
   # Check if PostgreSQL service is running
   Get-Service -Name postgresql*
   ```

2. Check DATABASE_URL in .env:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

3. Test connection with Prisma Studio:

   ```powershell
   npm run prisma:studio
   ```

4. Recreate database if needed:

   ```sql
   DROP DATABASE IF EXISTS code_review_db;
   CREATE DATABASE code_review_db;
   ```

5. Run migrations again:
   ```powershell
   npm run prisma:migrate
   ```

### 4. "Model not found" Error

**Problem:** LLM returns error about model not being available.

**Solutions:**

1. Pull the model:

   ```powershell
   ollama pull llama3.2:latest
   ```

2. Try alternative models:

   ```powershell
   # Smaller, faster model
   ollama pull llama3.2:3b

   # Code-focused model
   ollama pull codellama:latest
   ```

3. Update OLLAMA_MODEL in .env to match installed model

### 5. Port Already in Use

**Problem:** "Port 5000 is already in use" error when starting server.

**Solutions:**

1. Find and kill process using port 5000:

   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

2. Or change PORT in .env:
   ```env
   PORT=5001
   ```

### 6. Prisma Client Not Found

**Problem:** "Cannot find module '@prisma/client'" or similar errors.

**Solutions:**

1. Generate Prisma Client:

   ```powershell
   npm run prisma:generate
   ```

2. If still failing, delete and reinstall:
   ```powershell
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run prisma:generate
   ```

### 7. "No supported files found" Error

**Problem:** Analysis completes but says no supported files were found.

**Solutions:**

1. Check file extensions - supported: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .cs, .go, .rb, .php, .rs

2. Make sure you're analyzing code files, not just config files

3. Check that files have actual code changes (not just whitespace)

### 8. Analysis Takes Too Long

**Problem:** Code analysis is very slow.

**Solutions:**

1. Use a smaller/faster model:

   ```env
   OLLAMA_MODEL=llama3.2:3b
   ```

2. Reduce MAX_TOKENS:

   ```env
   MAX_TOKENS=2048
   ```

3. Analyze fewer files at once (stage only specific files)

4. Check system resources (RAM, CPU usage)

### 9. LLM Returns Empty or Invalid JSON

**Problem:** Analysis completes but finds no issues, or parsing errors occur.

**Solutions:**

1. This is usually a model issue. Try:

   - Different prompt temperature
   - Different model
   - Smaller code snippets

2. Check server logs for parsing errors

3. The system now has fallback error handling, so it should return empty results instead of crashing

### 10. CORS Errors in Frontend

**Problem:** Frontend can't connect to backend API.

**Solutions:**

1. Make sure FRONTEND_URL in backend .env matches your frontend URL:

   ```env
   FRONTEND_URL=http://localhost:5173
   ```

2. Check that server is running on correct port

3. Verify CORS is properly configured in server.js

### 11. Migration Failed

**Problem:** Prisma migration fails or schema out of sync.

**Solutions:**

1. Reset database (⚠️ WARNING: This deletes all data):

   ```powershell
   npm run prisma:push -- --force-reset
   ```

2. Or manually reset:

   ```powershell
   npx prisma migrate reset
   npm run prisma:migrate
   ```

3. Check for typos in schema.prisma

### 12. Git Repository Not Found

**Problem:** "Not a git repository" error when analyzing.

**Solutions:**

1. Make sure repositoryPath points to a Git repository

2. Initialize Git if needed:

   ```powershell
   cd your-project
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. Use absolute paths in API calls:
   ```
   C:/Users/YourName/Projects/your-repo
   ```

### 13. High Token Usage / Cost Concerns

**Problem:** Token usage is too high.

**Solutions:**

1. This system uses local LLM (Ollama) - NO CLOUD COSTS! Token tracking is just for monitoring.

2. To reduce token usage:
   - Analyze only changed lines (already implemented)
   - Use smaller models
   - Reduce MAX_TOKENS in .env
   - Disable verbose recommendations

### 14. Issues Not Saving to Database

**Problem:** Analysis completes but issues aren't saved.

**Solutions:**

1. Check for database constraint errors in logs

2. Verify review was created:

   ```powershell
   npm run prisma:studio
   # Check CodeReview table
   ```

3. Check for JSON parsing errors in logs

4. Ensure LLM is returning properly formatted JSON

### 15. Cannot Import ES Modules

**Problem:** "Cannot use import statement outside a module" error.

**Solutions:**

1. Verify package.json has:

   ```json
   "type": "module"
   ```

2. Use .js extension for ES modules

3. If using CommonJS, change to require() syntax

## Getting Help

If you're still experiencing issues:

1. **Check server logs** - Most errors are logged with details
2. **Enable verbose logging** - Set `NODE_ENV=development` in .env
3. **Check Prisma Studio** - `npm run prisma:studio` to inspect database
4. **Test with curl/Postman** - Isolate if it's a frontend or backend issue
5. **Run health check** - `curl http://localhost:5000/health`

## Useful Commands

```powershell
# Check all services
ollama list                          # Check Ollama models
Get-Service -Name postgresql*        # Check PostgreSQL
node --version                       # Check Node.js
git --version                        # Check Git

# Restart services
Restart-Service postgresql*          # Restart PostgreSQL
# For Ollama, restart your computer

# View logs
npm run dev                          # Server logs in real-time

# Database tools
npm run prisma:studio                # Visual database browser
npm run prisma:migrate               # Run migrations
npm run prisma:generate              # Regenerate client

# Test
npm run test:api                     # Run API tests
curl http://localhost:5000/health    # Quick health check
```

## Debug Mode

Enable detailed logging by setting in .env:

```env
NODE_ENV=development
```

This will show:

- All database queries
- Detailed error stack traces
- LLM request/response logs
- Token usage details
