import logging


def test_number1():
    logging.info(
        'Test 1 is starting <b>html</b> <p style="color:red">other</p> world<script></script>'
    )
    logging.warning("Test 1 is done")


def test_number2():
    logging.info("Test 2 is starting")
    logging.warning("Test 2 is done")
