import logging
from collections.abc import Generator

import pytest
from logscanner import LogviewHandler


@pytest.fixture(autouse=True)  # , scope="function")
def _setup_logging(request: pytest.FixtureRequest) -> Generator[None, None, None]:
    logfile = (
        request.path.parent / f"{request.path.name}_{request.function.__name__}.log"
    )

    # will generate the logfile your_logfile.html in the current directory,
    # once the logger is shutdown.
    handler = LogviewHandler(
        str(logfile),
    )
    logging.root.addHandler(handler)
    # allow everything from the root logger
    logging.root.setLevel(logging.NOTSET)

    yield

    logging.root.removeHandler(handler)
    handler.close()
