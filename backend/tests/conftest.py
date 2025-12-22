"""
Pytest configuration and shared fixtures for Portfolio AI tests.

This file contains:
- Database session fixtures
- Test client fixtures
- Common test utilities
- Shared test data
"""

import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
# from fastapi.testclient import TestClient  # Uncomment when FastAPI app is created
import os

# Import your app components (these will be created during development)
# from app.database import Base
# from app.main import app
# from app.config import Settings


@pytest.fixture(scope="session")
def test_database_url() -> str:
    """
    Provide test database URL.
    Override with environment variable if needed.
    """
    return os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://test:test@localhost:5432/portfolio_test"
    )


@pytest.fixture(scope="session")
def test_engine(test_database_url: str):
    """
    Create a test database engine.
    This is created once per test session.
    """
    engine = create_engine(test_database_url)
    
    # Create all tables
    # Uncomment when Base is available:
    # Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Drop all tables after tests
    # Uncomment when Base is available:
    # Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """
    Create a new database session for each test.
    
    This fixture:
    - Creates a new session for each test
    - Rolls back all changes after the test
    - Ensures test isolation
    
    Usage:
        def test_something(db_session):
            portfolio = Portfolio(name="Test")
            db_session.add(portfolio)
            db_session.commit()
            assert portfolio.id is not None
    """
    # Create session factory
    SessionLocal = sessionmaker(bind=test_engine)
    session = SessionLocal()
    
    yield session
    
    # Rollback any changes made during the test
    session.rollback()
    session.close()


@pytest.fixture(scope="function")
def client(db_session: Session):
    """
    Create a FastAPI test client with database session override.
    
    This fixture:
    - Creates a test client for API testing
    - Overrides the database dependency with test session
    - Ensures API tests use the test database
    
    Usage:
        def test_create_portfolio(client):
            response = client.post("/api/portfolios", json={...})
            assert response.status_code == 201
    """
    # Uncomment when app is available:
    # from app.main import app
    # from app.database import get_db
    
    # def override_get_db():
    #     yield db_session
    
    # app.dependency_overrides[get_db] = override_get_db
    # test_client = TestClient(app)
    
    # yield test_client
    
    # # Clean up
    # app.dependency_overrides.clear()
    
    # Placeholder for now
    return None


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_user_id() -> str:
    """Provide a consistent test user ID"""
    return "test-user-123"


@pytest.fixture
def sample_portfolio_data(sample_user_id: str) -> dict:
    """
    Provide sample portfolio data for testing.
    
    Usage:
        def test_create_portfolio(sample_portfolio_data):
            portfolio = Portfolio(**sample_portfolio_data)
            assert portfolio.name == "Tech Growth"
    """
    return {
        "name": "Tech Growth",
        "description": "Technology focused growth portfolio",
        "user_id": sample_user_id,
        "strategy_type": "aggressive",
    }


@pytest.fixture
def sample_positions() -> list[dict]:
    """
    Provide sample position data for testing.
    
    Returns a list of positions that sum to 100% allocation.
    """
    return [
        {"ticker": "AAPL", "allocation": 25.0},
        {"ticker": "MSFT", "allocation": 25.0},
        {"ticker": "GOOGL", "allocation": 25.0},
        {"ticker": "NVDA", "allocation": 25.0},
    ]


@pytest.fixture
def sample_market_data() -> dict:
    """
    Provide sample market data for mocking API responses.
    
    Usage:
        @patch('app.services.market_data.get_price')
        def test_something(mock_get_price, sample_market_data):
            mock_get_price.return_value = sample_market_data["AAPL"]["price"]
    """
    return {
        "AAPL": {
            "price": 175.50,
            "previous_close": 173.00,
            "change": 2.50,
            "change_percent": 1.45,
            "volume": 50000000,
        },
        "MSFT": {
            "price": 350.00,
            "previous_close": 351.25,
            "change": -1.25,
            "change_percent": -0.36,
            "volume": 25000000,
        },
        "GOOGL": {
            "price": 140.25,
            "previous_close": 139.50,
            "change": 0.75,
            "change_percent": 0.54,
            "volume": 30000000,
        },
        "NVDA": {
            "price": 495.00,
            "previous_close": 480.00,
            "change": 15.00,
            "change_percent": 3.13,
            "volume": 40000000,
        },
    }


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_gemini_response():
    """
    Provide a mock Gemini API response for testing AI service.
    
    Usage:
        @patch('google.generativeai.GenerativeModel')
        def test_ai_service(mock_model, mock_gemini_response):
            mock_model.return_value.generate_content.return_value = mock_gemini_response
    """
    from unittest.mock import Mock
    
    response = Mock()
    response.candidates = [Mock()]
    response.candidates[0].content.parts = [Mock()]
    response.candidates[0].content.parts[0].function_call.name = "create_portfolio"
    response.candidates[0].content.parts[0].function_call.args = {
        "name": "AI Generated Portfolio",
        "strategy_type": "moderate",
        "positions": [
            {"ticker": "AAPL", "allocation": 50.0},
            {"ticker": "MSFT", "allocation": 50.0},
        ]
    }
    
    return response


# ============================================================================
# Utility Functions
# ============================================================================

def assert_valid_uuid(value: str) -> None:
    """
    Assert that a string is a valid UUID.
    
    Usage:
        portfolio = create_portfolio(...)
        assert_valid_uuid(portfolio.id)
    """
    import uuid
    try:
        uuid.UUID(str(value))
    except (ValueError, AttributeError):
        pytest.fail(f"{value} is not a valid UUID")


def assert_allocations_sum_to_100(positions: list) -> None:
    """
    Assert that position allocations sum to 100%.
    
    Usage:
        assert_allocations_sum_to_100(portfolio.positions)
    """
    total = sum(
        p.get("allocation", 0) if isinstance(p, dict) 
        else getattr(p, "allocation", 0) 
        for p in positions
    )
    assert abs(total - 100.0) < 0.01, f"Allocations sum to {total}%, expected 100%"


# ============================================================================
# Pytest Configuration Hooks
# ============================================================================

def pytest_configure(config):
    """
    Configure pytest with custom markers.
    """
    config.addinivalue_line(
        "markers", "unit: Unit tests that test individual components in isolation"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests that test component interactions"
    )
    config.addinivalue_line(
        "markers", "api: API endpoint tests"
    )
    config.addinivalue_line(
        "markers", "ai: AI service tests"
    )
    config.addinivalue_line(
        "markers", "slow: Slow running tests"
    )
    config.addinivalue_line(
        "markers", "security: Security and adversarial tests"
    )


def pytest_collection_modifyitems(config, items):
    """
    Modify test collection to add markers automatically.
    """
    for item in items:
        # Auto-mark tests based on file path
        if "test_api" in str(item.fspath):
            item.add_marker(pytest.mark.api)
        elif "test_models" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "test_services" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "test_security" in str(item.fspath):
            item.add_marker(pytest.mark.security)
