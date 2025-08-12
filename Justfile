# Client formatting commands
format-client:
    cd client && npx prettier --write "src/**/*.{ts,tsx,js,jsx}"

check-format-client:
    cd client && npx prettier --check "src/**/*.{ts,tsx,js,jsx}"

# Server formatting commands (if needed later)
format-server:
    cd server && python -m black .

check-format-server:
    cd server && python -m black --check .

# Format everything
format-all: format-client format-server

check-format-all: check-format-client check-format-server