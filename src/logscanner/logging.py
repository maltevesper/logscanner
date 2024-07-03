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

    def emit(self, record) -> None:
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
            open(self._tempfile.name) as tempfile,
            resources.files(__package__)
            .joinpath("template/logscanner.html")
            .open() as template,
        ):
            for line in template:
                if r"{{logdata}}" in line:
                    for line in tempfile:
                        logfile.write(line)

                    continue

                logfile.write(line)

        pathlib.Path(self._tempfile.name).unlink(True)

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


def main():
    logging.warning("Test it.")
    logging.debug("Test it.")
    logging.fatal("Test it.")
    a = logging.getLogger("A")
    a_b = logging.getLogger("A.B")
    a_b_c = logging.getLogger("A.B.C")

    a.info("Test it.")
    a_b.info("Test it.")
    a_b_c.info("Test it.")

    try:
        1 / 0
    except ZeroDivisionError:
        logging.exception("message")


def demo():
    handler = LogviewHandler("thelog")
    logging.root.addHandler(handler)
    logging.root.setLevel(logging.NOTSET)

    streamhandler = logging.StreamHandler()
    streamhandler.setLevel(logging.INFO)
    logging.root.addHandler(streamhandler)

    main()


if __name__ == "__main__":
    demo()
