import logging
import json
import logging.handlers
import tempfile
import pathlib

# use logging.BufferingFormatter to wrap formatted messages into html file?


# class JsonLogger(logging.StreamLogger):
#     def emit(self, record):
#         print(record)


class LogviewLogger(logging.Handler):
    def __init__(self, filename) -> None:
        super().__init__()
        self.filename = f"{filename}.html"
        self._tempfile = tempfile.NamedTemporaryFile(
            mode="wt", delete=False, prefix=filename, suffix=".json"
        )
        self.formatter = JsonFormatter()
        # self.records = []
        self._separator = ""

    def emit(self, record) -> None:
        # self.records.append(self.formatter.format(record))
        self._tempfile.write(self._separator + self.formatter.format(record))
        self._separator = ",\n"

    def flush(self) -> None:
        # TODO: implement proper, should we ensure actual flushing just happens on close?
        # should we use a temp json file??
        # print(f"Flushing {len(self.records)} records.")
        # with open(self.filename, "a") as f:
        #     f.write("\n".join(self.records))
        # self.records = []
        self._tempfile.flush()
        return super().flush()

    # handler flushOnClose defaults to True so no need to flush in close
    def close(self) -> None:
        self._tempfile.close()

        with open(self.filename, "w") as logfile, open(
            self._tempfile.name
        ) as tempfile, open("./dist/index.html") as template:
            for line in template:
                if r"{{logdata}}" in line:
                    # logfile.write("[\n")

                    for line in tempfile:
                        logfile.write(line)

                    # logfile.seek(-2, 2)  # step back over newline and comma # seek from the end not allowed in text mode
                    # logfile.write("\n]\n")
                    continue

                logfile.write(line)

        pathlib.Path(self._tempfile.name).unlink(True)

        return super().close()


class JsonFormatter(logging.Formatter):
    def format(self, record) -> str:
        if record.exc_info:
            record.exc_text = self.formatException(record.exc_info)

        return json.dumps(record.__dict__, default=str)


def main():
    logging.warn("Test it.")
    logging.debug("Test it.")
    logging.fatal("Test it.")

    try:
        1 / 0
    except ZeroDivisionError:
        logging.exception("message")


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    # handler = logging.StreamHandler()
    handler = LogviewLogger("thelog")
    handler.setFormatter(JsonFormatter())
    logging.getLogger().addHandler(handler)
    main()
