# TDD Quick Start Guide
# Portfolio AI - Getting Started with Test-Driven Development

## 🚀 Quick Setup (5 minutes)

### 1. Install Testing Dependencies

```bash
cd /Users/soliv112/PersonalProjects/StrataMind/portfolio-ai

# Create backend directory if it doesn't exist
mkdir -p backend
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Mac/Linux

# Install core dependencies
pip install fastapi sqlalchemy psycopg2-binary pydantic python-dotenv alembic

# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock httpx faker factory-boy responses freezegun
```

### 2. Create Test Directory Structure

```bash
mkdir -p tests/{test_models,test_services,test_api,test_validators,test_tasks,test_security,fixtures}
touch tests/__init__.py
touch tests/conftest.py
touch tests/test_models/__init__.py
touch tests/test_services/__init__.py
touch tests/test_api/__init__.py
```

### 3. Configure pytest

Create `pytest.ini` in the backend directory:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    -ra
    --strict-markers
markers =
    unit: Unit tests
    integration: Integration tests
    api: API endpoint tests
    ai: AI service tests
    slow: Slow running tests
    security: Security tests
```

### 4. Set Up Test Database

```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@15  # Mac
# or use Docker:
docker run --name portfolio-test-db -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=portfolio_test -p 5432:5432 -d postgres:15

# Create test database
createdb portfolio_test -U test
```

---

## 📝 Your First TDD Cycle

### Example: Creating a Portfolio Model

#### Step 1: Write the Test First (RED)

Create `tests/test_models/test_portfolio.py`:

```python
import pytest
from datetime import datetime
from app.models.portfolio import Portfolio

@pytest.mark.unit
class TestPortfolioModel:
    
    def test_create_portfolio_with_required_fields(self, db_session):
        """Test creating a portfolio with minimum required fields"""
        # Arrange
        portfolio_data = {
            "name": "Tech Growth",
            "user_id": "user-123",
            "strategy_type": "aggressive"
        }
        
        # Act
        portfolio = Portfolio(**portfolio_data)
        db_session.add(portfolio)
        db_session.commit()
        
        # Assert
        assert portfolio.id is not None
        assert portfolio.name == "Tech Growth"
        assert portfolio.strategy_type == "aggressive"
        assert portfolio.created_at is not None
        assert isinstance(portfolio.created_at, datetime)
```

#### Step 2: Run the Test (Should FAIL)

```bash
pytest tests/test_models/test_portfolio.py -v
```

Expected output:
```
FAILED - ModuleNotFoundError: No module named 'app.models.portfolio'
```

#### Step 3: Write Minimal Code to Pass (GREEN)

Create `app/models/__init__.py` and `app/models/portfolio.py`:

```python
# app/models/portfolio.py
from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum

class StrategyType(str, enum.Enum):
    AGGRESSIVE = "aggressive"
    MODERATE = "moderate"
    CONSERVATIVE = "conservative"

class Portfolio(Base):
    __tablename__ = "portfolios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    user_id = Column(String(255), nullable=False)
    strategy_type = Column(Enum(StrategyType), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### Step 4: Run Test Again (Should PASS)

```bash
pytest tests/test_models/test_portfolio.py -v
```

Expected output:
```
PASSED ✓
```

#### Step 5: Refactor (If Needed)

Now you can improve the code while keeping tests green!

---

## 🎯 TDD Workflow Checklist

For each feature you build:

- [ ] **Write the test first** - Define expected behavior
- [ ] **Run the test** - Verify it fails (RED)
- [ ] **Write minimal code** - Make the test pass (GREEN)
- [ ] **Run the test again** - Verify it passes
- [ ] **Refactor** - Improve code quality
- [ ] **Run all tests** - Ensure nothing broke
- [ ] **Commit** - Save your progress

---

## 🧪 Common Test Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

```python
def test_something(self):
    # Arrange - Set up test data
    portfolio = Portfolio(name="Test", user_id="123", strategy_type="moderate")
    
    # Act - Execute the code being tested
    result = portfolio.calculate_value()
    
    # Assert - Verify the outcome
    assert result == expected_value
```

### Pattern 2: Testing Exceptions

```python
def test_invalid_allocation_raises_error(self):
    # Arrange
    invalid_data = {"allocation": 150.0}
    
    # Act & Assert
    with pytest.raises(ValueError, match="Allocation cannot exceed 100"):
        Position(**invalid_data)
```

### Pattern 3: Using Fixtures

```python
@pytest.fixture
def sample_portfolio(db_session):
    """Reusable portfolio for tests"""
    portfolio = Portfolio(name="Test", user_id="123", strategy_type="moderate")
    db_session.add(portfolio)
    db_session.commit()
    return portfolio

def test_with_fixture(self, sample_portfolio):
    assert sample_portfolio.name == "Test"
```

### Pattern 4: Mocking External Services

```python
from unittest.mock import patch

@patch('app.services.market_data.MarketDataService.get_stock_price')
def test_portfolio_value_calculation(self, mock_price):
    # Arrange
    mock_price.return_value = 175.50
    
    # Act
    value = calculate_portfolio_value()
    
    # Assert
    assert value == expected_value
    mock_price.assert_called_once_with("AAPL")
```

---

## 📊 Running Tests

### Basic Commands

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_models/test_portfolio.py

# Run specific test
pytest tests/test_models/test_portfolio.py::TestPortfolioModel::test_create_portfolio

# Run tests by marker
pytest -m unit          # Only unit tests
pytest -m integration   # Only integration tests
pytest -m "not slow"    # Exclude slow tests
```

### Coverage Commands

```bash
# Run with coverage report
pytest --cov=app --cov-report=html

# View coverage in browser
open htmlcov/index.html

# Show missing lines in terminal
pytest --cov=app --cov-report=term-missing

# Fail if coverage below 80%
pytest --cov=app --cov-fail-under=80
```

### Watch Mode (Auto-run on file changes)

```bash
# Install pytest-watch
pip install pytest-watch

# Run in watch mode
ptw -- --cov=app
```

---

## 🎓 TDD Best Practices

### ✅ DO

1. **Write tests before code** - This is the core of TDD
2. **Keep tests simple** - One assertion per test when possible
3. **Use descriptive names** - `test_create_portfolio_with_invalid_allocation_raises_error`
4. **Test behavior, not implementation** - Focus on what, not how
5. **Keep tests fast** - Unit tests should run in milliseconds
6. **Use fixtures for setup** - Avoid code duplication
7. **Test edge cases** - Null values, empty lists, boundary conditions
8. **Mock external dependencies** - APIs, databases, file systems

### ❌ DON'T

1. **Don't write tests after code** - You'll miss the TDD benefits
2. **Don't test framework code** - Trust that SQLAlchemy works
3. **Don't make tests dependent** - Each test should run independently
4. **Don't ignore failing tests** - Fix or remove them
5. **Don't test private methods** - Test public interface only
6. **Don't over-mock** - Mock only what you need to
7. **Don't skip refactoring** - It's part of the cycle
8. **Don't aim for 100% coverage** - Focus on critical paths

---

## 🚦 Development Workflow

### Daily TDD Routine

```bash
# 1. Start your day
git pull origin develop
source venv/bin/activate

# 2. Pick a feature from task.md
# Example: "Create Portfolio Service"

# 3. Write a failing test
# tests/test_services/test_portfolio_service.py

# 4. Run the test (should fail)
pytest tests/test_services/test_portfolio_service.py -v

# 5. Write minimal code to pass
# app/services/portfolio_service.py

# 6. Run the test (should pass)
pytest tests/test_services/test_portfolio_service.py -v

# 7. Refactor if needed

# 8. Run all tests to ensure nothing broke
pytest

# 9. Check coverage
pytest --cov=app --cov-report=term-missing

# 10. Commit your work
git add .
git commit -m "feat: add portfolio creation service with tests"

# 11. Repeat for next feature
```

---

## 📚 Example Test Suite Structure

```
tests/
├── __init__.py
├── conftest.py                    # Shared fixtures
├── fixtures/
│   ├── sample_data.py            # Test data
│   └── factories.py              # Factory Boy factories
├── test_models/
│   ├── __init__.py
│   ├── test_portfolio.py         # Portfolio model tests
│   ├── test_position.py          # Position model tests
│   └── test_performance.py       # Performance model tests
├── test_services/
│   ├── __init__.py
│   ├── test_portfolio_service.py # Portfolio service tests
│   ├── test_market_data.py       # Market data service tests
│   └── test_ai_service.py        # AI service tests
├── test_api/
│   ├── __init__.py
│   ├── test_portfolios.py        # Portfolio endpoints
│   └── test_chat.py              # AI chat endpoints
├── test_validators/
│   ├── __init__.py
│   └── test_portfolio_validator.py
└── test_security/
    ├── __init__.py
    └── test_adversarial_prompts.py
```

---

## 🎯 Phase-by-Phase Testing Roadmap

### Week 1-2: Setup & Models
- [ ] Set up test environment
- [ ] Write Portfolio model tests
- [ ] Write Position model tests
- [ ] Write PerformanceHistory model tests
- [ ] Achieve 95%+ model coverage

### Week 3-4: Services & API
- [ ] Write PortfolioService tests
- [ ] Write MarketDataService tests
- [ ] Write PerformanceService tests
- [ ] Write API endpoint tests
- [ ] Achieve 90%+ service coverage

### Week 5-6: AI Integration
- [ ] Write AIService tests
- [ ] Write validator tests
- [ ] Write adversarial prompt tests
- [ ] Write human-in-the-loop workflow tests
- [ ] Achieve 85%+ AI service coverage

### Week 7-8: Advanced Features
- [ ] Write portfolio group tests
- [ ] Write scheduled task tests
- [ ] Write integration tests
- [ ] Achieve 80%+ overall coverage

---

## 🆘 Troubleshooting

### Test Database Connection Issues

```python
# In conftest.py, ensure proper database URL
import os
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/portfolio_test"
```

### Import Errors

```bash
# Ensure app module is in Python path
export PYTHONPATH="${PYTHONPATH}:/Users/soliv112/PersonalProjects/StrataMind/portfolio-ai/backend"
```

### Slow Tests

```python
# Mark slow tests
@pytest.mark.slow
def test_expensive_operation():
    pass

# Skip slow tests
pytest -m "not slow"
```

### Flaky Tests

```python
# Use freezegun for time-dependent tests
from freezegun import freeze_time

@freeze_time("2026-01-15 10:00:00")
def test_time_dependent_feature():
    pass
```

---

## 📖 Resources

- [TDD Framework](TDD_FRAMEWORK.md) - Complete testing documentation
- [Project Plan](PROJECT_PLAN.md) - Development roadmap
- [pytest Documentation](https://docs.pytest.org/)
- [Test-Driven Development by Example](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530) - Kent Beck

---

## ✅ Ready to Start?

1. Run the setup commands above
2. Create your first test
3. Watch it fail
4. Make it pass
5. Refactor
6. Repeat!

**Remember**: Red → Green → Refactor. This is the way! 🚀
