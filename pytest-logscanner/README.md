# pytest-logscanner

Adds html log files for each test.

To delete logfiles before running the tests add the `--logscanner-clear` option to the pytest call:

```
pytest --logscanner-clear
```

To only clear the log files without running the tests use:

```
pytest --logscanner-clear --collect-only
```