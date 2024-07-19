import logging
from collections.abc import Generator
from pathlib import Path

import pytest
from logscanner import LogviewHandler


def log_file_path(pytest_file: Path, pytest_function_name: str) -> Path:
    return pytest_file.parent / f"{pytest_file.name}_{pytest_function_name}.log.html"


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--logscanner-clear",
        action="store_true",
        help="delete all logscanner logs",
    )

    parser.addoption(
        "--logscanner-basepath",
        action="store",
        default=".",
        type=Path,
        help="set the base directory under which logscanner logs are stored",
    )


@pytest.fixture(autouse=True)  # , scope="function")
def _setup_logging(
    request: pytest.FixtureRequest,
) -> Generator[None, None, None]:
    logfile = (
        log_file_path(
            request.config.getoption("--logscanner-basepath")
            / request.path.relative_to(Path(".").absolute(), walk_up=True),
            request.function.__name__,
        )
        .with_suffix("")
        .absolute()
    )

    logfile.parent.mkdir(exist_ok=True, parents=True)

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


def pytest_report_header(config: pytest.Config) -> str | None:
    return f"logscanner will place logs under {config.getoption("--logscanner-basepath").absolute()}"


@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(
    config: pytest.Config,
    items: list[pytest.Item],
) -> None:  # session, config,
    if config.getoption("--logscanner-clear"):
        for item in items:
            log_file_path(
                config.getoption("--logscanner-basepath")
                / item.path.relative_to(Path(".").absolute(), walk_up=True),
                item.name,
            ).unlink(missing_ok=True)
