#!/bin/bash
# sim_install.sh — Install and launch relish on iPhone 17 Pro Max simulator
# Usage: bash scripts/sim_install.sh <ipa_url>
# Example: bash scripts/sim_install.sh "https://expo.dev/artifacts/eas/5tWYoSPcqwEpc8mJjQYEYe.ipa"

DEVICE_ID="4491D982-9191-4E2C-9DD3-74A7F207159E"
BUNDLE_ID="com.sauc-e.relish"
IPA_URL="$1"
IPA_PATH=~/relish369nu/relish.ipa

if [ -z "$IPA_URL" ]; then
  echo "❌ No IPA URL provided."
  echo "Usage: bash scripts/sim_install.sh \"<ipa_url>\""
  exit 1
fi

echo "Step 1 — Booting iPhone 17 Pro Max simulator..."
xcrun simctl boot $DEVICE_ID 2>/dev/null || echo "Already booted or booting."

echo "Step 2 — Opening Simulator app..."
open -a Simulator

echo "Step 3 — Downloading .ipa..."
curl -L "$IPA_URL" -o $IPA_PATH
echo "✅ Downloaded to $IPA_PATH"

echo "Step 4 — Installing .ipa on simulator..."
xcrun simctl install $DEVICE_ID $IPA_PATH
echo "✅ Installed."

echo "Step 5 — Launching app..."
xcrun simctl launch $DEVICE_ID $BUNDLE_ID
echo "✅ relish launched. Check the Simulator window."