#!/bin/bash
# Runs one film unattended with Claude Code on Fable 5.2, and watches it.
#
#   kit/run-fable.sh <project folder> "<what to do>"
#
# It uses your Claude subscription, never API credits: any ANTHROPIC_API_KEY is removed for the run.
# One film at a time: a second run waits to be started until the first is over.
# If nothing has happened for 20 minutes (no new line in the log, no new file in out/) and there
# is no video, it stops the session and resumes the SAME session once with a short, direct order.
# If it ends without a video, it resumes once more. Then it stops and says where it died.
#
#   FVM_STALL_MIN=20   minutes of silence before it steps in
#   FVM_MODEL=fable    the model alias
#   CLAUDE_BIN=claude  the Claude Code command
set -u
DIR="${1:-}"; PROMPT="${2:-}"
if [ -z "$DIR" ] || [ -z "$PROMPT" ] || [ ! -d "$DIR" ]; then
  echo "usage: kit/run-fable.sh <project folder> \"<what to do>\""; exit 2
fi
DIR="$(cd "$DIR" && pwd)"
CLAUDE="${CLAUDE_BIN:-claude}"
MODEL="${FVM_MODEL:-fable}"
STALL_MIN="${FVM_STALL_MIN:-20}"
POLL="${FVM_POLL_SEC:-30}"
LOCK="${FVM_LOCK:-$HOME/.fable-video-maker.lock}"
command -v "$CLAUDE" >/dev/null 2>&1 || { echo "!!  Claude Code is not installed (the '$CLAUDE' command is missing)."; exit 2; }

if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "!!  Another film is already running (process $(cat "$LOCK")). One at a time: these runs are long and spend usage."; exit 3
fi
echo $$ > "$LOCK"
CHILD=""
cleanup() { [ -n "$CHILD" ] && kill "$CHILD" 2>/dev/null; rm -f "$LOCK"; }
trap cleanup EXIT
trap 'exit 130' INT TERM

mkdir -p "$DIR/out"
# The session starts with nothing but the prompt: point it at the skill's own file, wherever skills load from.
SKILL_MD="$(dirname "$(cat "$DIR/kit/.home" 2>/dev/null)" 2>/dev/null)/SKILL.md"
[ -f "$SKILL_MD" ] && PROMPT="First read $SKILL_MD and the look file it names for this film, and follow them. $PROMPT"
START="$DIR/out/.run-started"; : > "$START"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

have_video() { [ -n "$(find "$DIR/out" -maxdepth 1 -name '*.mp4' -newer "$START" -size +1k 2>/dev/null | head -1)" ]; }
# The newest sign of life: the log, or anything written under out/ (frames count).
last_activity() {
  local newest
  newest="$(find "$1" "$DIR/out" -type f -newer "$START" -exec stat -f %m {} + 2>/dev/null | sort -n | tail -1)"
  [ -z "$newest" ] && newest="$(find "$1" "$DIR/out" -type f -newer "$START" -printf '%T@\n' 2>/dev/null | sort -n | tail -1 | cut -d. -f1)"
  [ -z "$newest" ] && newest="$(stat -f %m "$START" 2>/dev/null || stat -c %Y "$START")"
  echo "$newest"
}
session_of() { grep -o '"session_id":"[^"]*"' "$1" 2>/dev/null | head -1 | cut -d'"' -f4; }

# run <log> <message> [session to resume]. Returns 0 when it ended by itself, 1 when it was stopped as stalled.
run() {
  local log="$1" msg="$2" resume="${3:-}"
  local argv=(-p --model "$MODEL" --permission-mode acceptEdits --allowedTools "Read,Write,Edit,Glob,Grep,Bash,Skill" --add-dir "$DIR" --output-format stream-json --verbose)
  [ -n "$resume" ] && argv=(-p --resume "$resume" "${argv[@]:1}")
  ( cd "$DIR" && exec env -u ANTHROPIC_API_KEY "$CLAUDE" "${argv[@]}" "$msg" ) > "$log" 2>&1 &
  CHILD=$!
  while kill -0 "$CHILD" 2>/dev/null; do
    sleep "$POLL"
    local idle=$(( $(date +%s) - $(last_activity "$log") ))
    if [ "$idle" -gt $(( STALL_MIN * 60 )) ] && ! have_video; then
      echo "    quiet for $(( idle / 60 )) min with no video: stopping the session"
      kill "$CHILD" 2>/dev/null; sleep 2; kill -9 "$CHILD" 2>/dev/null
      wait "$CHILD" 2>/dev/null; CHILD=""
      return 1
    fi
  done
  wait "$CHILD" 2>/dev/null; CHILD=""
  return 0
}

LOG="$DIR/claude-build.log"
echo "film: $DIR"
echo "log:  $LOG   (model: $MODEL, subscription only)"
run "$LOG" "$PROMPT"; ENDED=$?
SESSION="$(session_of "$LOG")"

if ! have_video; then
  if [ -z "$SESSION" ]; then
    echo "!!  No video and no session to resume. Last lines of the log:"; tail -5 "$LOG"; exit 1
  fi
  if grep -qi "usage limit\|rate limit" "$LOG"; then
    echo "!!  Claude hit a usage limit. Nothing is lost. When it resets, resume the same session:"
    echo "    kit/run-fable.sh is not needed; run:  cd \"$DIR\" && env -u ANTHROPIC_API_KEY $CLAUDE -p --resume $SESSION --model $MODEL --permission-mode acceptEdits --allowedTools 'Read,Write,Edit,Glob,Grep,Bash' \"Carry on from STATE.md.\""
    exit 4
  fi
  [ "$ENDED" -eq 1 ] && WHY="You stalled." || WHY="You stopped before the video was written."
  echo "    resuming session $SESSION once"
  run "$DIR/claude-build-resume.log" "$WHY Read STATE.md and check what exists in the project and in out/. If the stills are already good, render the final video now with: node kit/capture.mjs --resume. If not, finish the stills pass first, then render. Do not start the film again from scratch." "$SESSION"
  LOG="$DIR/claude-build-resume.log"
fi

if have_video; then
  VIDEO="$(find "$DIR/out" -maxdepth 1 -name '*.mp4' -newer "$START" | head -1)"
  echo "done: $VIDEO"
  grep -o '"modelUsage":{"[^"]*"' "$LOG" | tail -1 | sed 's/.*{"/model used: /; s/"$//'
  exit 0
fi
echo "!!  It ended twice without a video. It stops here."
echo "    frames captured: $(find "$DIR/out/frames" -type f 2>/dev/null | wc -l | tr -d ' ')   ·   stills: $(find "$DIR/out/review" -maxdepth 1 -name '*.jpg' 2>/dev/null | wc -l | tr -d ' ')"
echo "    last lines of the log:"; tail -5 "$LOG"
exit 1
