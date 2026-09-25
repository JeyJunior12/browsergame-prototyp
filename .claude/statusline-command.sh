#!/bin/bash
# Claude Code status line: shows model name and token usage for the current session.
input=$(cat)

model=$(echo "$input" | jq -r '.model.display_name // "Claude"')
in_tok=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
out_tok=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

total=$((in_tok + out_tok))

fmt() {
  local n=$1
  if [ "$n" -ge 1000000 ]; then
    awk -v n="$n" 'BEGIN{printf "%.1fM", n/1000000}'
  elif [ "$n" -ge 1000 ]; then
    awk -v n="$n" 'BEGIN{printf "%.1fk", n/1000}'
  else
    printf "%d" "$n"
  fi
}

tokens_str=$(fmt "$total")
ctx_str=$(fmt "$ctx_size")

if [ -n "$used_pct" ]; then
  printf "\033[2m%s | Tokens: %s/%s (%.0f%%)\033[0m" "$model" "$tokens_str" "$ctx_str" "$used_pct"
else
  printf "\033[2m%s | Tokens: %s\033[0m" "$model" "$tokens_str"
fi
