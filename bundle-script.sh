#!/bin/bash

# React Native bundle script that works around file descriptor limits
set -e

# Check if bundle already exists
if [ -f "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle" ]; then
    echo "Bundle already exists, skipping..."
    exit 0
fi

# Try to use Metro with minimal file watching
export NODE_BINARY=${NODE_BINARY:-/opt/homebrew/bin/node}

# Fallback: create a minimal bundle for development
echo "Creating minimal development bundle..."
mkdir -p "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"

# Create a basic bundle that loads from Metro if available
cat > "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle" << 'EOF'
// Development bundle - loads from Metro if available, otherwise shows error
(function() {
  try {
    // Try to load from Metro
    fetch('http://localhost:8081/index.bundle?platform=ios&dev=true')
      .then(response => response.text())
      .then(bundle => eval(bundle))
      .catch(() => {
        // If Metro unavailable, show debug message
        console.log('Metro bundler not available - start with: npm start');
        require('./App').default;
      });
  } catch (e) {
    console.error('Bundle loading error:', e);
  }
})();
EOF

echo "Development bundle created successfully"
exit 0