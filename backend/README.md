# ComplyAI Backend

FastAPI backend for the AI Compliance & Intelligence Platform.

## Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
copy .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Visit `http://localhost:8000/api/docs` for interactive Swagger UI.

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/documents/upload` | Upload document |
| GET | `/api/v1/documents/` | List documents |
| POST | `/api/v1/chat/ask` | Ask a question (RAG/SQL/Agent) |
| GET | `/api/v1/chat/sessions` | Chat history |
| POST | `/api/v1/reports/generate` | Generate compliance report |
| GET | `/api/v1/analytics/overview` | Dashboard stats |
