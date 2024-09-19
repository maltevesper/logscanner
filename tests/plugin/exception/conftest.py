import pytest
import logging


@pytest.fixture
def setup_teardown_log():
    logging.info("Setup")
    try:
        yield
    finally:
        logging.info("Teardown")
