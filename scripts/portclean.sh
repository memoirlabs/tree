#!/usr/bin/env bash
set -euo pipefail

START_PORT=3000
END_PORT=3005
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="$REPO_ROOT/site"
NEXT_DEV_LOCK_FILE="$APP_ROOT/.next/dev/lock"
ALL_PIDS=""

get_pids() {
  lsof -nP -tiTCP:${START_PORT}-${END_PORT} -sTCP:LISTEN 2>/dev/null | sort -u || true
}

get_lock_pid() {
  if [ ! -f "$NEXT_DEV_LOCK_FILE" ]; then
    return 0
  fi

  python3 - "$NEXT_DEV_LOCK_FILE" <<'PY'
import json
import sys

path = sys.argv[1]
try:
    with open(path, "r", encoding="utf-8") as file:
        payload = json.load(file)
    pid = payload.get("pid")
    if isinstance(pid, int):
        print(pid)
except Exception:
    pass
PY
}

is_next_dev_process() {
  local pid="$1"
  local args
  args="$(ps -p "$pid" -o args= 2>/dev/null || true)"

  if [ -z "$args" ]; then
    return 1
  fi

  [[ "$args" == *"$APP_ROOT/node_modules/.bin/next dev"* ]] \
    || [[ "$args" == *"$APP_ROOT/node_modules/next/dist/server/lib/start-server.js"* ]] \
    || [[ "$args" == *"bun --bun next dev"* ]]
}

append_pid() {
  local pid="$1"
  if [ -z "$pid" ]; then
    return
  fi

  if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
    return
  fi

  case " $ALL_PIDS " in
    *" $pid "*) ;;
    *) ALL_PIDS="${ALL_PIDS:+$ALL_PIDS }$pid" ;;
  esac
}

collect_next_dev_chain() {
  local pid="$1"
  local current="$pid"

  while [ -n "$current" ] && [ "$current" != "1" ]; do
    append_pid "$current"
    local parent
    parent="$(ps -p "$current" -o ppid= 2>/dev/null | tr -d ' ' || true)"
    if [ -z "$parent" ] || ! is_next_dev_process "$parent"; then
      break
    fi
    current="$parent"
  done
}

clear_stale_lock_if_needed() {
  if [ ! -f "$NEXT_DEV_LOCK_FILE" ]; then
    return
  fi

  local lock_pid
  lock_pid="$(get_lock_pid)"
  if [ -n "$lock_pid" ] && kill -0 "$lock_pid" 2>/dev/null; then
    return
  fi

  rm -f "$NEXT_DEV_LOCK_FILE"
}

print_sorted_pid_lines() {
  local pid_list="$1"
  if [ -z "$pid_list" ]; then
    return
  fi

  for pid in $pid_list; do
    printf '%s\n' "$pid"
  done | sort -n
}

build_alive_pid_list() {
  local pid_list="$1"
  local alive_pids=""

  for pid in $pid_list; do
    if kill -0 "$pid" 2>/dev/null; then
      case " $alive_pids " in
        *" $pid "*) ;;
        *) alive_pids="${alive_pids:+$alive_pids }$pid" ;;
      esac
    fi
  done

  printf '%s' "$alive_pids"
}

while IFS= read -r pid; do
  append_pid "$pid"
done < <(get_pids)

lock_pid="$(get_lock_pid)"
if [ -n "$lock_pid" ]; then
  collect_next_dev_chain "$lock_pid"
fi

if [ -z "$ALL_PIDS" ]; then
  clear_stale_lock_if_needed
  echo "No listening processes found on ports ${START_PORT}-${END_PORT}."
  exit 0
fi

pids="$(print_sorted_pid_lines "$ALL_PIDS")"

echo "Stopping processes on ports ${START_PORT}-${END_PORT}: $(printf '%s\n' "$pids" | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
printf '%s\n' "$pids" | xargs kill 2>/dev/null || true
sleep 1

stubborn_pid_list=""

while IFS= read -r pid; do
  case " $stubborn_pid_list " in
    *" $pid "*) ;;
    *) stubborn_pid_list="${stubborn_pid_list:+$stubborn_pid_list }$pid" ;;
  esac
done < <(get_pids)

if [ -n "$lock_pid" ]; then
  while IFS= read -r pid; do
    if [ -n "$pid" ]; then
      case " $stubborn_pid_list " in
        *" $pid "*) ;;
        *) stubborn_pid_list="${stubborn_pid_list:+$stubborn_pid_list }$pid" ;;
      esac
    fi
  done < <(
    current="$lock_pid"
    while [ -n "$current" ] && [ "$current" != "1" ]; do
      printf '%s\n' "$current"
      parent="$(ps -p "$current" -o ppid= 2>/dev/null | tr -d ' ' || true)"
      if [ -z "$parent" ] || ! is_next_dev_process "$parent"; then
        break
      fi
      current="$parent"
    done
  )
fi

stubborn_pids="$(build_alive_pid_list "$stubborn_pid_list")"
stubborn_pids="$(print_sorted_pid_lines "$stubborn_pids")"

if [ -n "$stubborn_pids" ]; then
  echo "Force killing stubborn processes: $(printf '%s\n' "$stubborn_pids" | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  printf '%s\n' "$stubborn_pids" | xargs kill -9
fi

clear_stale_lock_if_needed
echo "Ports ${START_PORT}-${END_PORT} are clean."
