#!/usr/bin/env bash
# Run script for OfficeGPT backend (works on macOS & Linux)
set -e
ROOT_DIR="$(cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd)"
cd "$ROOT_DIR"

# Virtualenv location inside the package
VENV_DIR="$ROOT_DIR/.venv"
PYTHON=${PYTHON:-python3}

# Use PORT env var if provided
PORT=${PORT:-7000}
HOST=${HOST:-127.0.0.1}

echo "Ensuring virtualenv exists at $VENV_DIR..."
if [ ! -d "$VENV_DIR" ]; then
	echo "Creating virtualenv..."
	$PYTHON -m venv "$VENV_DIR"
fi

# Activate venv
# shellcheck source=/dev/null
# source "$VENV_DIR/bin/activate"
source "$VENV_DIR/Scripts/activate"

echo "Upgrading pip and installing requirements (this may take a while)..."
python -m pip install --upgrade pip
python -m pip install python-dotenv
if [ -f "$ROOT_DIR/requirements.txt" ]; then
	python -m pip install -r "$ROOT_DIR/requirements.txt"
else
	echo "Warning: requirements.txt not found at $ROOT_DIR. Skipping dependency installation."
fi

echo "Starting OfficeGPT backend..."
# PYTHONPATH=ROOT_DIR ensures agents/, graph.py, db.py, schema.py are all importable
PYTHONPATH="$ROOT_DIR" python -m uvicorn backend.server:app --host ${HOST} --port ${PORT} --workers 1 &
PID=$!

echo "OfficeGPT is running at http://${HOST}:${PORT}"
echo "To stop the server: kill $PID"
wait $PID