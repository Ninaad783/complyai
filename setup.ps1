# ComplyAI Setup Script
# Run this from the d:\ai-project directory

Write-Host ""
Write-Host "  ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗  ██╗   █████╗ ██╗" -ForegroundColor Cyan
Write-Host " ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║  ╚██╗ ██╔══██╗██║" -ForegroundColor Cyan
Write-Host " ██║     ██║   ██║██╔████╔██║██████╔╝██║   ╚████╔╝ ███████║██║" -ForegroundColor Cyan
Write-Host " ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║    ╚██╔╝  ██╔══██║██║" -ForegroundColor Cyan
Write-Host " ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗██║   ██║  ██║██║" -ForegroundColor Cyan
Write-Host ""
Write-Host " AI Compliance & Intelligence Platform - Setup" -ForegroundColor White
Write-Host ""

# Check for .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "[1/4] Creating backend .env from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "      ⚠️  Edit backend\.env and add your GOOGLE_API_KEY!" -ForegroundColor Red
} else {
    Write-Host "[1/4] backend\.env already exists ✓" -ForegroundColor Green
}

# Frontend deps
Write-Host "[2/4] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Set-Location ..
Write-Host "      Frontend deps installed ✓" -ForegroundColor Green

# Backend venv
Write-Host "[3/4] Setting up Python virtual environment..." -ForegroundColor Yellow
Set-Location backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt --quiet
Set-Location ..
Write-Host "      Backend venv ready ✓" -ForegroundColor Green

Write-Host "[4/4] Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host " To start the app:" -ForegroundColor White
Write-Host ""
Write-Host "  Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    .\venv\Scripts\activate" -ForegroundColor Gray
Write-Host "    uvicorn app.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "  Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  Or with Docker:" -ForegroundColor Cyan
Write-Host "    docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "  Frontend → http://localhost:3000" -ForegroundColor Green
Write-Host "  API Docs → http://localhost:8000/api/docs" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
