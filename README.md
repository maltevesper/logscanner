# Logscanner

A simple proof of concept rendering python logging as html pages with a gui for quick filtering and analysis.
A single html file contains everything (html, css, javascript, logdata) so it is easy to pass along. If the log data should  be handled automatically, it is easy to either install an additional handler/formatter or to extract the json from the html file.

![LogScanner screenshot](doc/images/screenshot.png)

## Install

```pip install logscanner```

## Filtering

Currently the viewer allows to filter messages out based on the logger and the level of the message.

There are 4 filter settings, in descending priority order:

 1. show
 2. hide
 3. show-weak
 4. hide-weak

In general the hierarchy is based on a _don't hide the smoking gun philosophy_, i.e. in case of doubt messages are rather shown than hidden.

If a logger is set to _hide-weak_, the message will be hidden, unless a parent logger is set to _show_. Child logger messages will be displayed based on their visibility.

If a logger is set to _show-weak_, the message will be shown, unless a parent logger is set to _hide_. Child logger messages will be displayed based on their visibility.

If a logger is set to _hide_, the message will be hidden, unless a parent logger is set to _show_. Child logger messages will be hidden, unless they or a parent logger is set to _show_. Parent logger includes loggers above the logger which is set to _hide_.

If a logger is set to _show_, its messages and all the messages of child loggers will be shown.

The usual usage would be to set all loggers to _show-weak_ and remove all messages below a certain sublogger level by setting the topmost logger level below which messages should be hidden to _hide_.

## A word on the name
Original the project was supposed to be called `logviewer` but that name was taken on pypi, so here we are until we come up with a better name than `logscanner`.

# Example usage

The simplest way to use this with pytest is to use the pytest-logscanner plugin (`pip install logscanner[pytest]`).

```python
from logscanner import LogviewHandler
import logging

handler = LogviewHandler("your_logfile") # will generate the logfile your_logfile.html in the current directory, once the logger is shutdown.
logging.root.addHandler(handler)
logging.root.setLevel(logging.NOTSET)  # allow everything from the root logger

# Optional second handler to output to stderr
streamhandler = logging.StreamHandler()
streamhandler.setLevel(logging.INFO) # Filter on the handler, not on the logger
logging.root.addHandler(streamhandler)
```

In case you want to use this without the pytest plugin you could create a fixture like this in your conftest.py:

```python
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
```

# Building

```
pdm build
```


## Development

```
: build the html template
cd html
npm install
npm run build
cd ..
```

```
: might be useful for working on the template
npx webpack --watch
```

## project structure
in ./html is the source to create a html page with gui elements (css, javascript, fonts, etc.). The page is baked into a single file template using webpack. This file is bundled with a trivial logging formatter (json) and a logging handler which combines the json log and the html template into a single file log.

