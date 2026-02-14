#!/bin/bash

# NeuralDeck Code Review Helper Script
# Usage: ./scripts/review-pr.sh <PR_NUMBER> [options]

set -e

PR_NUMBER=$1
shift || true

if [ -z "$PR_NUMBER" ]; then
    echo "Usage: ./scripts/review-pr.sh <PR_NUMBER> [options]"
    echo ""
    echo "Options:"
    echo "  --security    Focus on security review"
    echo "  --performance Focus on performance review"
    echo "  --architecture Focus on architecture review"
    echo "  --all         Run all reviews (default)"
    echo ""
    echo "Examples:"
    echo "  ./scripts/review-pr.sh 123"
    echo "  ./scripts/review-pr.sh 123 --security"
    exit 1
fi

# Check if gh CLI is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI not authenticated. Run: gh auth login"
    exit 1
fi

echo "🔍 NeuralDeck Code Review"
echo "=========================="
echo "PR: #$PR_NUMBER"
echo ""

# Get PR info
echo "📋 Fetching PR information..."
PR_DATA=$(gh pr view "$PR_NUMBER" --json number,title,author,additions,deletions,files,url,headRefName,baseRefName)

TITLE=$(echo "$PR_DATA" | jq -r '.title')
AUTHOR=$(echo "$PR_DATA" | jq -r '.author.login')
ADDITIONS=$(echo "$PR_DATA" | jq -r '.additions')
DELETIONS=$(echo "$PR_DATA" | jq -r '.deletions')
FILES=$(echo "$PR_DATA" | jq -r '.files | length')
URL=$(echo "$PR_DATA" | jq -r '.url')

echo "  Title: $TITLE"
echo "  Author: $AUTHOR"
echo "  Changes: +$ADDITIONS -$DELETIONS in $FILES files"
echo ""

# Check PR size
TOTAL_CHANGES=$((ADDITIONS + DELETIONS))
if [ $TOTAL_CHANGES -gt 1000 ]; then
    echo "⚠️  WARNING: Large PR ($TOTAL_CHANGES lines changed)"
    echo "   Consider breaking into smaller PRs"
    echo ""
elif [ $TOTAL_CHANGES -gt 500 ]; then
    echo "📊 Medium sized PR ($TOTAL_CHANGES lines)"
    echo ""
fi

# Get changed files
echo "📁 Changed Files:"
echo "$PR_DATA" | jq -r '.files[].path' | head -20
FILE_COUNT=$(echo "$PR_DATA" | jq -r '.files | length')
if [ "$FILE_COUNT" -gt 20 ]; then
    echo "   ... and $((FILE_COUNT - 20)) more files"
fi
echo ""

# Trigger review
echo "🚀 Triggering automated review..."
gh pr comment "$PR_NUMBER" --body "/review"

echo ""
echo "✅ Review triggered!"
echo "🔗 $URL"
echo ""
echo "The automated review bot will post results as a comment."
