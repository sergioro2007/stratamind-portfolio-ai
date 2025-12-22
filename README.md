# Portfolio AI - AI-Powered Portfolio Management

An intelligent portfolio management platform that uses Google Gemini to create, manage, and optimize investment portfolios through natural language conversations.

## Features

- 🤖 **AI-Powered Portfolio Creation** - Create portfolios using natural language prompts
- 📊 **Hierarchical Portfolio Groups** - Organize portfolios like M1 Finance Pies or Fidelity Baskets
- 📈 **Automated Performance Tracking** - Real-time portfolio valuation and returns
- 🔄 **AI-Driven Rebalancing** - Weekly/monthly strategy adjustments with human approval
- 🛡️ **Safety Guardrails** - Multi-layer validation prevents harmful modifications
- 📝 **Complete Audit Trail** - Track all AI decisions and user actions

## Technology Stack

- **Backend**: FastAPI + Python 3.11+
- **Database**: PostgreSQL with SQLAlchemy
- **AI**: Google Gemini API
- **Market Data**: Alpha Vantage API
- **Task Queue**: Celery + Redis
- **Frontend**: Next.js 14 + React (coming soon)
- **Testing**: pytest + pytest-cov (TDD approach)

## Project Status

🚧 **In Development** - Multiple Tracks:

1. **Existing App** (`stratamind-agent/`) - React/TypeScript frontend with Google Gemini AI
   - ✅ Functional portfolio management UI
   - ✅ AI-powered portfolio creation
   - 🧪 **Now adding comprehensive tests with TDD**

2. **Backend Development** (Planned) - FastAPI + PostgreSQL backend
   - 📋 See [PROJECT_PLAN.md](PROJECT_PLAN.md) for detailed roadmap

## Testing the Existing Application

The `stratamind-agent` folder contains a working React application. We're now applying TDD principles to:
- Add comprehensive test coverage
- Find and fix bugs
- Refactor for better code quality
- Add missing functionality (market data, validation, etc.)

### Quick Start with Testing

```bash
# Automated setup (recommended)
./setup-tests.sh

# Or manual setup
cd stratamind-agent
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Testing Documentation

- **[TDD_EXISTING_APP_QUICKSTART.md](TDD_EXISTING_APP_QUICKSTART.md)** - Quick start guide for testing the existing app
- **[TDD_EXISTING_APP_PLAN.md](TDD_EXISTING_APP_PLAN.md)** - Complete implementation plan with 100+ example tests
- **[setup-tests.sh](setup-tests.sh)** - Automated setup script

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for backend development roadmap.

## Test-Driven Development

This project follows **Test-Driven Development (TDD)** principles. All features are developed using the Red-Green-Refactor cycle.

### Quick Test Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
pip install -r requirements-test.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m api          # API tests only
```

### Testing Documentation

- **[TDD Framework](TDD_FRAMEWORK.md)** - Comprehensive testing strategy and specifications
- **[TDD Quick Start](TDD_QUICKSTART.md)** - Get started with TDD in 5 minutes
- **Test Coverage Target**: 80%+ overall, 100% for critical paths

### Current Test Structure

```
backend/tests/
├── conftest.py              # Shared fixtures and configuration
├── test_models/             # Database model tests
├── test_services/           # Business logic tests
├── test_api/                # API endpoint tests
└── fixtures/                # Test data and factories
```

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis (for task queue)
- Google Gemini API key
- Alpha Vantage API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd portfolio-ai

# Set up backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Set up database
createdb portfolio_ai
alembic upgrade head

# Run tests to verify setup
pytest

# Start development server
uvicorn app.main:app --reload
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
open htmlcov/index.html

# Run specific test file
pytest tests/test_models/test_portfolio.py

# Run tests matching a pattern
pytest -k "portfolio"

# Run only fast tests (skip slow tests)
pytest -m "not slow"
```

## Development Workflow

This project follows TDD principles:

1. **Write a failing test** - Define expected behavior
2. **Write minimal code** - Make the test pass
3. **Refactor** - Improve code quality
4. **Repeat** - Continue with next feature

See [TDD_QUICKSTART.md](TDD_QUICKSTART.md) for detailed workflow.

## Documentation

- **[Project Plan](PROJECT_PLAN.md)** - Comprehensive development plan and roadmap
- **[TDD Framework](TDD_FRAMEWORK.md)** - Complete testing strategy and specifications
- **[TDD Quick Start](TDD_QUICKSTART.md)** - Quick guide to get started with TDD
- API Documentation - Coming soon
- Architecture Guide - Coming soon

## Project Structure

```
portfolio-ai/
├── backend/
│   ├── app/
│   │   ├── models/          # Database models
│   │   ├── services/        # Business logic
│   │   ├── api/             # API endpoints
│   │   ├── validators/      # Input validation
│   │   └── tasks/           # Background tasks
│   ├── tests/
│   │   ├── test_models/     # Model tests
│   │   ├── test_services/   # Service tests
│   │   └── test_api/        # API tests
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/                # Next.js frontend (coming soon)
├── docs/                    # Documentation
├── PROJECT_PLAN.md          # Development roadmap
├── TDD_FRAMEWORK.md         # Testing strategy
└── README.md                # This file
```

## Development Phases

- **Phase 1**: Prototype in Google AI Studio ✅ (Current)
- **Phase 2**: Build MVP Backend (Weeks 3-4)
- **Phase 3**: Integrate Gemini AI (Weeks 5-6)
- **Phase 4**: Advanced Features (Weeks 7-8)
- **Phase 5**: Safety & Testing (Weeks 9-10)
- **Phase 6**: Frontend Development (Weeks 11-14)

## Contributing

This project follows TDD principles. When contributing:

1. Write tests first
2. Ensure all tests pass
3. Maintain 80%+ code coverage
4. Follow the existing code style
5. Update documentation as needed

## License

TBD

## Contact

For questions or feedback, please open an issue.

---

**Built with Test-Driven Development** 🧪 | **Powered by Google Gemini** 🤖
