# Code Review Backend

Automated code review system using locally hosted LLM (Ollama) for privacy and performance.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **Ollama** - Local LLM runtime
4. **Git** - For repository analysis

## Setup Instructions

### 1. Install Ollama

**Windows:**

- Download from: https://ollama.com/download
- Run the installer
- Verify installation: `ollama --version`

**Pull the LLM model:**

```powershell
ollama pull llama3.2:latest
```

Verify Ollama is running:

```powershell
ollama list
```

### 2. Setup PostgreSQL Database

Create a new database:

```sql
CREATE DATABASE code_review_db;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE code_review_db TO postgres;
```

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/code_review_db?schema=public"
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:latest
MAX_TOKENS=4096
```

### 4. Install Dependencies

```powershell
npm install
```

### 5. Setup Database Schema

Generate Prisma Client:

```powershell
npm run prisma:generate
```

Run migrations:

```powershell
npm run prisma:migrate
```

Seed the database:

```powershell
npm run prisma:seed
```

Seed coding standards:

```powershell
# Start the server first, then in another terminal:
curl -X POST http://localhost:5000/api/standards/seed
# Or use Postman/Insomnia to POST to: http://localhost:5000/api/standards/seed
```

### 6. Start the Server

Development mode (with auto-reload):

```powershell
npm run dev
```

Production mode:

```powershell
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check

- `GET /health` - Check server and LLM status

### Code Reviews

- `POST /api/reviews/analyze-staged` - Analyze staged changes
- `POST /api/reviews/analyze-commit` - Analyze specific commit
- `GET /api/reviews` - Get all reviews for user
- `GET /api/reviews/:id` - Get specific review
- `DELETE /api/reviews/:id` - Delete review
- `GET /api/reviews/stats/:userId` - Get review statistics

### Review Interactions

- `POST /api/reviews/:id/comments` - Add comment to review
- `PUT /api/reviews/issues/:issueId/resolve` - Mark issue as resolved
- `POST /api/reviews/issues/:issueId/fix` - Generate automatic fix

### Coding Standards

- `GET /api/standards` - Get all standards
- `GET /api/standards/:id` - Get specific standard
- `POST /api/standards` - Create custom standard
- `PUT /api/standards/:id` - Update standard
- `DELETE /api/standards/:id` - Delete standard
- `POST /api/standards/seed` - Seed built-in standards

## Usage Example

### Analyze Staged Changes

```javascript
POST /api/reviews/analyze-staged
Content-Type: application/json

{
  "repositoryPath": "C:/Users/YourName/Projects/your-repo",
  "userId": 1
}
```

**Before running analysis:**

1. Navigate to your repository
2. Stage your changes: `git add .`
3. Call the API endpoint

### Analyze Specific Commit

```javascript
POST /api/reviews/analyze-commit
Content-Type: application/json

{
  "repositoryPath": "C:/Users/YourName/Projects/your-repo",
  "commitHash": "abc123def456",
  "userId": 1
}
```

## Supported Languages

- JavaScript (.js, .jsx)
- TypeScript (.ts, .tsx)
- Python (.py)
- Java (.java)
- C++ (.cpp)
- C (.c)
- C# (.cs)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- Rust (.rs)

## Analysis Dimensions

The system analyzes code across multiple dimensions:

1. **Security** - SQL injection, XSS, authentication flaws, data exposure
2. **Bugs & Logic** - Error handling, edge cases, null checks, logic errors
3. **Performance** - Algorithm efficiency, memory leaks, database queries
4. **Code Quality** - Style violations, code smells, complexity, readability
5. **Testing** - Missing tests, test coverage, testability
6. **Architecture** - Design patterns, separation of concerns, scalability
7. **Documentation** - Missing docstrings, unclear comments
8. **CI/CD** - Build issues, deployment concerns

## Troubleshooting

### Ollama Not Running

```powershell
# Check if Ollama is running
ollama list

# Start Ollama service (usually starts automatically)
# If not, restart your computer or reinstall Ollama
```

### Database Connection Failed

```powershell
# Check if PostgreSQL is running
# Verify DATABASE_URL in .env file
# Test connection:
npm run prisma:studio
```

### LLM Model Not Found

```powershell
# Pull the model again
ollama pull llama3.2:latest

# List available models
ollama list
```

### No Staged Changes Error

```powershell
# Make sure you have staged changes
cd your-repository
git status
git add .
```

### Port Already in Use

```powershell
# Change PORT in .env file
# Or kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

## Development

### Database Migrations

Create new migration:

```powershell
npx prisma migrate dev --name your_migration_name
```

View database in Prisma Studio:

```powershell
npm run prisma:studio
```

### Testing Endpoints

Use tools like:

- **Postman** - Import collection from `postman_collection.json` (if available)
- **Insomnia** - REST client
- **curl** - Command line
- **Thunder Client** - VS Code extension

## Performance Tips

1. **Use appropriate LLM models:**

   - `llama3.2:latest` - Balanced performance
   - `llama3.2:3b` - Faster, less accurate
   - `codellama:latest` - Code-focused

2. **Adjust MAX_TOKENS** based on your needs:

   - Higher = more detailed analysis but slower
   - Lower = faster but less comprehensive

3. **Analyze only changed files** - Use staged analysis instead of commit analysis when possible

4. **Optimize database queries** - Index frequently queried fields

## Security Notes

- Never commit `.env` file
- Change default passwords in production
- Use HTTPS in production
- Implement proper authentication (JWT recommended)
- Rate limit API endpoints (already configured)
- Validate all user inputs

## License

MIT License - See LICENSE file for details
