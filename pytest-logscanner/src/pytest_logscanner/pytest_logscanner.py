import logging
from pathlib import Path
from typing import Any

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


# TODO: subclass this plugin? (cleaner containment of module globals in class)
# def pytest_configure(config):
#     config.pluginmanager.register(MyPlugin())


# class MyPlugin:

#     def pytest_configure(self, config):
#         self.config = config

#     def pytest_runtest_logstart(self, nodeid, location):
#         ...  # access self.config

#     def pytest_runtest_logfinish(self, nodeid, location):
#         ...  # access self.config


logger = logging.getLogger("Testexecutor")

_loghandles = {}
_config: pytest.Config


@pytest.hookimpl
def pytest_configure(config: pytest.Config):
    global _config
    _config = config


@pytest.hookimpl(tryfirst=True)  # (wrapper=True)
def pytest_runtest_logstart(nodeid: str, location: tuple[str, int | None, str]):
    file, line, testname = location
    logfile = (
        log_file_path(
            _config.getoption("--logscanner-basepath")
            / Path(_config.rootpath, file).relative_to(
                Path(".").absolute(), walk_up=True
            ),
            testname,
        )
        .with_suffix("")
        .absolute()
    )

    logfile.parent.mkdir(exist_ok=True, parents=True)

    # will generate the logfile your_logfile.html in the current directory,
    # once the logger is shutdown.
    handler = LogviewHandler(
        str(logfile),
        Path(_config.rootpath),
    )
    logging.root.addHandler(handler)
    # allow everything from the root logger
    logging.root.setLevel(logging.NOTSET)

    _loghandles[nodeid] = handler
    # yield


def pytest_runtest_logfinish(nodeid: str, location: tuple[str, int | None, str]):
    handler = _loghandles[nodeid]
    logging.root.removeHandler(handler)
    handler.close()
    del _loghandles[nodeid]


def pytest_exception_interact(
    node: pytest.Item | pytest.Collector,
    call: pytest.CallInfo[Any],
    report: pytest.CollectReport | pytest.TestReport,
):
    logging.exception("Exception during test execution", exc_info=call.excinfo._excinfo)


def pytest_runtest_logreport(report: pytest.TestReport) -> None:
    logger.info(f"Teststage {report.when}")


# hooks of interest
# pytest_runtest_makereport
# pytest_warning_recorded
# pytest_assertion_pass
# pytest_assertrepr_compare
