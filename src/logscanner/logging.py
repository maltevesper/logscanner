"""Loggers for python logging to create a logview.html file."""

import json
import logging
import logging.handlers
import pathlib
import tempfile
from importlib import resources

# use logging.BufferingFormatter to wrap formatted messages into html file?


class LogviewHandler(logging.Handler):
    """Handler to log to logview.html."""

    def __init__(self, filename) -> None:
        super().__init__()
        self.filename = f"{filename}.html"
        self._tempfile = tempfile.NamedTemporaryFile(
            mode="wt", delete=False, prefix=filename, suffix=".json"
        )
        self.formatter = JsonFormatter()
        self._separator = ""

    def emit(self, record: logging.LogRecord) -> None:
        self._tempfile.write(self._separator + self.formatter.format(record))
        self._separator = ",\n"

    def flush(self) -> None:
        self._tempfile.flush()
        return super().flush()

    # handler flushOnClose defaults to True so no need to flush in close
    def close(self) -> None:
        """Closes the logging file handler and emits the final html file."""
        self._tempfile.close()

        with (
            open(self.filename, "w") as logfile,
            open(self._tempfile.name) as temporary_logfile,
            resources.files(__package__)
            .joinpath("template/logscanner.html")
            .open() as template,
        ):
            for line in template:
                if r"{{logdata}}" in line:
                    for logrecord in temporary_logfile:
                        logfile.write(logrecord)

                    continue

                logfile.write(line)

        pathlib.Path(self._tempfile.name).unlink(missing_ok=True)

        return super().close()


class JsonFormatter(logging.Formatter):
    """Formatter for JSON output."""

    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as string."""
        if record.exc_info:
            record.exc_text = self.formatException(record.exc_info)

        # do we need to call formatTime, if the logging format stirng contains a reference to asctime?
        # self.asctime = self.formatTime(record,
        record.message = record.getMessage()

        return json.dumps(record.__dict__, default=str)
