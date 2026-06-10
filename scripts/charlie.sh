#!/bin/bash
# Charlie the Cache Exorcist v1.1 — Continental Membership
# Summon when the build ghosts haunt you across SDK boundaries
echo "🧟 Charlie summoned. Exorcising cache ghosts..."
npm cache clean --force
rm -rf node_modules package-lock.json ios
rm -rf ~/Library/Caches/eas-cli ~/.eas
npm install --legacy-peer-deps
echo "✨ Cache exorcised. Ready to build."
echo "Next: npx eas-cli build --platform ios --profile production --clear-cache"
