#!/bin/bash
# Run this after editing index.html, style.css, or app.js
# to update the app bundle.

SRC="$(cd "$(dirname "$0")" && pwd)"
WWW="$SRC/Code Beauty.app/Contents/Resources/www"

cp "$SRC/index.html" "$WWW/"
cp "$SRC/style.css"  "$WWW/"
cp "$SRC/app.js"     "$WWW/"

echo "✅ App updated"
