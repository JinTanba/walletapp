#!/bin/bash

# Sepolia Fork Configuration
SEPOLIA_RPC_URL=${SEPOLIA_RPC_URL:-"https://ethereum-sepolia-rpc.publicnode.com"}
CHAIN_ID=11155111

echo "Starting Anvil with Sepolia fork..."
echo "RPC URL: $SEPOLIA_RPC_URL"
echo "Chain ID: $CHAIN_ID"
echo "Local RPC: http://127.0.0.1:8545"

# Anvilを起動（Sepoliaをfork）
anvil \
  --fork-url "$SEPOLIA_RPC_URL" \
  --chain-id "$CHAIN_ID" \
  --port 8545 \
  --host 0.0.0.0
