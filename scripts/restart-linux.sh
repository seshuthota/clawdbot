#!/bin/bash

# Check if the service is active/enabled
if systemctl --user list-units --full -all | grep -Fq "clawdis.service"; then
  echo "♻️  Restarting clawdis service..."
  systemctl --user restart clawdis
  
  if [ $? -eq 0 ]; then
    echo "✅ Service restarted."
    echo "📋 Tailing logs (Ctrl+C to stop)..."
    echo ""
    journalctl --user -u clawdis -f -n 20
  else
    echo "❌ Failed to restart service."
    exit 1
  fi
else
  echo "⚠️  'clawdis.service' not found in systemd user units."
  echo "   If you are running manually, just Ctrl+C the process and run 'npm start' again."
fi
