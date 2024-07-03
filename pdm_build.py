"""Build hooks for pdm."""

import contextlib
import os
import subprocess
from collections.abc import Generator
from pathlib import Path

from pdm.backend.hooks import Context


@contextlib.contextmanager
def working_directory(
    path: str | bytes | os.PathLike,
) -> Generator[None, None, None]:
    """Context manager for working directory."""
    prev_cwd = Path.cwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(prev_cwd)


def generate_html_template() -> None:
    """Use webpack to generate the single file html template from sources."""
    with working_directory("html"):
        subprocess.check_call(["npm", "install"])
        subprocess.check_call(["npx", "webpack"])


def pdm_build_update_files(context: Context, files: dict[str, Path]) -> None:
    """Generate template files and add them to package."""
    if context.target in ["wheel", "editable"]:
        generate_html_template()
        project_name = context.config.metadata["name"]
        template_file = "logscanner.html"
        template_package_dir = Path(project_name) / "template"
        template_source_dir = Path("./html/dist")

        files[template_package_dir / template_file] = (
            template_source_dir / template_file
        )

        if context.target == "editable":
            template_file_install_path = (
                context.root / "src" / template_package_dir / template_file
            )

            template_file_install_path.parent.mkdir(
                parents=True,
                exist_ok=True,
            )
            template_file_install_path.unlink(missing_ok=True)
            template_file_install_path.symlink_to(
                (template_source_dir / template_file)
                .resolve()
                .relative_to(template_file_install_path.parent, walk_up=True),
            )
