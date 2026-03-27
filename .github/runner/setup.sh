#!/bin/bash
# One-time setup script for Tencent Cloud CVM
# Run: bash setup.sh
set -e

echo "=== Installing Docker ==="
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed."
else
  echo "Docker already installed, skipping."
fi

echo ""
echo "=== Configuring .env ==="
if [ ! -f .env ]; then
  read -p "GitHub repo URL (e.g. https://github.com/yourname/ClawX): " REPO_URL
  read -p "GitHub PAT (ghp_xxx, needs 'repo' scope): " GITHUB_TOKEN
  cat > .env << EOF
REPO_URL=${REPO_URL}
GITHUB_TOKEN=${GITHUB_TOKEN}
EOF
  echo ".env created."
else
  echo ".env already exists, skipping."
fi

echo ""
echo "=== Building and starting runner ==="
docker compose build
docker compose up -d

echo ""
echo "=== Status ==="
docker compose ps
echo ""
echo "Done! Runner should appear at:"
echo "  https://github.com/YOUR_ORG/YOUR_REPO/settings/actions/runners"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f   # watch logs"
echo "  docker compose restart   # restart runner"
echo "  docker compose down      # stop runner"
