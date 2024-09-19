import logging


def test_exception(setup_teardown_log):
    logging.warning("OH NO!WORLD")
    raise ValueError("Test exception")
    print("Hello")
