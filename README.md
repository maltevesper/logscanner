# Logview

A simple proof of concept rendering python logging as html pages with a gui for quick filtering and analysis.
A single html file contains everything (html, css, javascript, logdata) so it is easy to pass along. If the log data should  be handled automatically, it is easy to either install an additional handler/formatter or to extract the json from the html file.

# Example usage

```python
    from logview import LogviewHandler
    import logging

    handler = LogviewHandler("your_logfile")
    logging.root.addHandler(handler)
    logging.root.setLevel(logging.NOTSET)  # allow everything from the root logger

    # Optional second handler to output to stderr
    streamhandler = logging.StreamHandler()
    streamhandler.setLevel(logging.INFO) # Filter on the handler, not on the logger
    logging.root.addHandler(streamhandler)
```

# Building

cd html
npm install
npm run build
cd ..


## Development

npx webpack --watch

## project structure
in ./html is the source to create a html page with gui elements (css, javascript, fonts, etc.). The page is baked into a single file template using webpack. This file is bundled with a trivial logging formatter (json) and a logging handler which combines the json log and the html template into a single file log.

