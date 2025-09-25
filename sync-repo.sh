#!/bin/bash

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  echo "Usage: ./push.sh [commit message]"
  echo "If a commit message is provided as an argument, it will be used. Otherwise, you will be prompted to enter one."
  echo "Commits and pushes with format: USER: Message - Timestamp"
  echo "Options:"
  echo "  -h, --help    Show this help message"
  exit 0
fi

if [[ -n "$1" ]]; then
  message="$1"
else
  read -p "Enter commit message: " message
fi

user=$(whoami)
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
commit_msg="$user: $message - $timestamp"

git add .
git commit -m "$commit_msg"
git push
