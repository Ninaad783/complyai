# ComplyAI 🛡️
### Enterprise AI Compliance & Intelligence Platform

A production-grade GenAI compliance and intelligence platform where organizations upload policies, contracts, regulations, and datasets to perform deep semantic search, multi-agent risk auditing, text-to-SQL analytics, and automated compliance reporting.

---

## 🚀 Key Features

| Capability | Description | Status |
| :--- | :--- | :---: |
| 📄 **Document RAG** | Vector search over PDFs, DOCX, CSV, Excel with Gemini embeddings & page citations | ✅ |
| 🗄️ **Text-to-SQL** | Natural language queries executed against internal relational database tables | ✅ |
| 🤖 **5-Agent Workflow** | Retriever ➔ SQL ➔ Compliance ➔ Risk ➔ Report multi-agent pipeline | ✅ |
| 🛡️ **Security Guard** | Real-time prompt injection, adversarial pattern, and jailbreak detection | ✅ |
| 📈 **RAG Evaluation** | Faithfulness, Answer Relevancy, Context Precision, and Hallucination Risk metrics | ✅ |
| 📊 **Compliance Reports** | Automated executive report generation with downloadable Markdown export (`.md`) | ✅ |
| 🐳 **Dockerization** | Multi-stage Dockerfiles + `docker-compose.yml` for backend & frontend | ✅ |
| ⚙️ **Automated CI/CD** | GitHub Actions pipeline running Pytest suites, Next.js builds, & Docker checks | ✅ |
| 🔐 **Authentication** | JWT Authentication with Role-Based Access Control (RBAC) | ✅ |

---

## 🏗️ Architecture

```
                       ┌─────────────────────────┐
                       │     Next.js 16 UI       │
                       │ (React 19, Tailwind v4) │
                       └────────────┬────────────┘
                                    │ HTTP / JSON
                       ┌────────────▼────────────┐
                       │     FastAPI Backend     │
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │  Security Guardrail     │
                       │ (Prompt Injection Check)│
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │    Intent Classifier    │
                       └─────┬──────┬──────┬─────┘
                             │      │      │
            ┌────────────────┘      │      └────────────────┐
            ▼                       ▼                       ▼
     ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
     │  RAG Engine  │        │ Text-to-SQL  │        │ Multi-Agent  │
     │  (Gemini +   │        │   (SQLite /  │        │   Pipeline   │
     │ Vector Sim)  │        │  PostgreSQL) │        │  (5 Agents)  │
     └──────┬───────┘        └──────┬───────┘        └──────┬───────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │  RAG Evaluation Engine  │
                       │ (Faithfulness, Relevancy│
                       └─────────────────────────┘
```

---

## ⚡ Quick Start with Docker

### 1. Prerequisites
- Docker & Docker Compose installed
- Google Gemini API Key

### 2. Configure Environment
```bash
# In backend/.env
GOOGLE_API_KEY="your-gemini-api-key"
SECRET_KEY="your-secret-key"
```

### 3. Launch All Services
```bash
docker compose up -d --build
```

Access the services:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Swagger API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 💻 Local Development Setup

### Backend (FastAPI + Python 3.12)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # On Windows
# source venv/bin/activate     # On Linux / macOS

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Next.js 16 + React 19)
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev -- --port 3000
```

---

## 🧪 Testing & Quality Assurance

Run the automated backend test suite:
```bash
cd backend
venv\Scripts\pytest tests/ -v
```

**Test Suite Coverage:**
- `tests/test_api.py`: Health checks, user registration, JWT generation, login, duplicate email prevention.
- `tests/test_security.py`: Benign query validation, adversarial prompt injection pattern blocking, input sanitization.
- `tests/test_evaluator.py`: RAG evaluation metrics (Faithfulness, Relevancy, Context Precision, Hallucination Risk).

---

## ⚙️ Automated CI/CD Pipeline (`.github/workflows/ci.yml`)

The repository includes a 3-tier GitHub Actions workflow:
1. **`backend-tests`**: Runs on Ubuntu 22.04 with Python 3.12, installs dependencies, and runs the Pytest suite.
2. **`frontend-build`**: Runs on Node.js 20, verifies TypeScript types, and compiles the Next.js production build.
3. **`docker-build`**: Validates that both backend and frontend Docker container images build cleanly via Buildx.

---

## 📁 Repository Structure

```
ai-project/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated CI/CD Pipeline
├── backend/
│   ├── app/
│   │   ├── api/v1/            # Auth, Documents, Chat, Agents, Reports, Analytics
│   │   ├── core/              # Config, SQLite/PostgreSQL Database, JWT Security
│   │   ├── models/            # SQLAlchemy Data Models
│   │   └── services/          # RAG Engine, Text-to-SQL, Agent Orchestrator, Security Guard, Evaluator
│   ├── tests/                 # Pytest Unit & Integration Tests
│   ├── Dockerfile             # Multi-stage production Python container
│   ├── .dockerignore
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (Dashboard, Chat, Documents, Reports, Agents, Login)
│   │   ├── components/        # Sidebar, UI Widgets
│   │   ├── contexts/          # AuthContext
│   │   └── lib/               # API Client with fallback demo mode
│   ├── Dockerfile             # Multi-stage standalone Next.js container
│   ├── .dockerignore
│   └── package.json
└── docker-compose.yml         # Container orchestration with health checks
```
