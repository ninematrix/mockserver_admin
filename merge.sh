#!/bin/sh
set -eu

EXPECT_DIR="./config/expectations"
OUTPUT="./config/initializerJson.json"

# ---------------------------------------------------------------------
# 检查 expectations 目录是否存在
# ---------------------------------------------------------------------
if [ ! -d "$EXPECT_DIR" ]; then
  echo "❌ ERROR: Directory '$EXPECT_DIR' does not exist."
  exit 1
fi

# ---------------------------------------------------------------------
# 找到所有 JSON 文件
# ---------------------------------------------------------------------
FILES=$(find "$EXPECT_DIR" -maxdepth 1 -type f -name "*.json" | sort)

if [ -z "$FILES" ]; then
  echo "⚠ WARNING: No JSON files found in $EXPECT_DIR"
  echo "[]" > "$OUTPUT"
  echo "✔ Generated empty initializerJson.json"
  exit 0
fi

# ---------------------------------------------------------------------
# 合并 JSON 文件
# ---------------------------------------------------------------------
echo "[" > "$OUTPUT"

FIRST=true
for f in $FILES; do
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$OUTPUT"
  fi

  cat "$f" >> "$OUTPUT"
done

echo "]" >> "$OUTPUT"

# ---------------------------------------------------------------------
# 结果输出
# ---------------------------------------------------------------------
COUNT=$(echo "$FILES" | wc -w | tr -d ' ')
echo "✔ Successfully merged $COUNT JSON file(s) → $OUTPUT"
