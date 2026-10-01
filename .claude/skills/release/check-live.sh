#!/bin/sh
# Has GitHub Pages deployed what is on main, and does the live site serve this checkout's release?
#
#   sh .claude/skills/release/check-live.sh
#
# 1. fetches origin/main (NO_FETCH=1 skips it) and checks this checkout's files equal main's;
# 2. reads the number in the LIVE sw.js and js/app.js, with a cache-busting query so the 10-minute
#    Pages CDN cache can't show a stale copy (a kill-switch sw.js is recognised by its header);
# 3. with the gh CLI: the latest "pages build and deployment" run, its id, and whether it is for
#    main's current commit (so a docs-only push, which keeps the number, is not reported LIVE early).
#
# Exit 0 = LIVE (all three agree), 1 = not yet, 2 = the latest deploy run failed.
SITE="${SITE:-https://victorfromaruba-stack.github.io/iberostar-club}"
REPO="${REPO:-victorfromaruba-stack/iberostar-club}"
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
num() { grep -m1 -oE "$1 *= *[0-9]+" | grep -oE '[0-9]+$'; }

[ -n "$NO_FETCH" ] || git -C "$ROOT" fetch --quiet origin main 2>/dev/null || echo "note   could not fetch origin/main; using the last fetched copy"
LOCAL=$(num 'DATA_VERSION' < "$ROOT/js/app.js")
# A kill-switch sw.js starts with "/* KILL SWITCH:" (the normal one only mentions it further down).
LOCAL_KILL=; head -n 1 "$ROOT/sw.js" | grep -q 'KILL SWITCH' && LOCAL_KILL=1
HEAD_SHA=$(git -C "$ROOT" rev-parse HEAD 2>/dev/null)
MAIN_SHA=$(git -C "$ROOT" rev-parse origin/main 2>/dev/null)
CB=$(date +%s)
LIVE_SW_SRC=$(curl -fsS "$SITE/sw.js?cb=$CB" 2>/dev/null)
LIVE_SW=$(printf '%s\n' "$LIVE_SW_SRC" | num 'const VERSION')
LIVE_KILL=; printf '%s\n' "$LIVE_SW_SRC" | head -n 1 | grep -q 'KILL SWITCH' && LIVE_KILL=1
LIVE_APP=$(curl -fsS "$SITE/js/app.js?cb=$CB" 2>/dev/null | num 'DATA_VERSION')

echo "local  release ${LOCAL:-?}${LOCAL_KILL:+ (sw.js = kill switch)}  ·  HEAD $(printf %.7s "$HEAD_SHA")  ·  origin/main $(printf %.7s "${MAIN_SHA:-?}")"
if [ -n "$LIVE_KILL" ]; then LIVE_SW_TXT="KILL SWITCH"; else LIVE_SW_TXT="VERSION ${LIVE_SW:-none (404 or unreachable)}"; fi
echo "live   sw.js $LIVE_SW_TXT  ·  js/app.js DATA_VERSION ${LIVE_APP:-?}"

ok=1
# This checkout must be what main holds (uncommitted edits aside), or "live" says nothing about it.
if [ -z "$MAIN_SHA" ]; then
    echo "main   no origin/main in this checkout: cannot tell whether your commit reached main"; ok=0
elif ! git -C "$ROOT" diff --quiet HEAD origin/main -- 2>/dev/null; then
    echo "main   your HEAD's files differ from origin/main: either your commit is not on main yet (push or"
    echo "       merge it), or main has newer commits (git switch main && git pull --ff-only origin main)"; ok=0
fi
[ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ] && echo "note   uncommitted changes in this checkout are not part of any release"

# The live files must carry this release.
numbers_ok=1
if [ -z "$LOCAL" ] || [ "$LIVE_APP" != "$LOCAL" ]; then numbers_ok=0
elif [ -n "$LOCAL_KILL" ]; then [ -n "$LIVE_KILL" ] || numbers_ok=0
elif [ "$LIVE_SW" != "$LOCAL" ]; then numbers_ok=0
fi
[ "$numbers_ok" = 1 ] || ok=0

# The latest Pages deploy must be for main's commit and have succeeded.
failed=
if command -v gh >/dev/null 2>&1 && RUN=$(gh run list -R "$REPO" --workflow pages-build-deployment -L 1 \
        --json databaseId,status,conclusion,headSha,createdAt \
        --jq '.[0] | "\(.databaseId) \(.status) \(.conclusion // "-") \(.headSha) \(.createdAt)"' 2>/dev/null) && [ -n "$RUN" ]; then
    set -- $RUN   # id status conclusion sha created
    echo "pages  run $1: $2/$3 for commit $(printf %.7s "$4") at $5"
    if [ "$3" = "failure" ] || [ "$3" = "cancelled" ]; then
        failed=1; ok=0
        echo "       see why: gh run view $1 -R $REPO --log-failed"
    elif [ "$2" != "completed" ] || [ "$3" != "success" ]; then ok=0
    elif [ -n "$MAIN_SHA" ] && [ "$4" != "$MAIN_SHA" ]; then
        echo "       (that is not main's commit $(printf %.7s "$MAIN_SHA") yet: its deploy has not started or finished)"; ok=0
    fi
else
    echo "pages  (gh unavailable or not signed in: deploy run not checked, only the live numbers)"
fi

if [ "$ok" = 1 ]; then
    echo "LIVE   release $LOCAL is being served (from main $(printf %.7s "$MAIN_SHA"))."
    exit 0
fi
if [ -n "$failed" ]; then
    echo "FAILED the last Pages deploy did not succeed: open the run above, fix, push again."
    exit 2
fi
if [ "$numbers_ok" = 1 ]; then
    echo "NOT YET  the live numbers match, but main's latest commit is not deployed yet (or is not your HEAD, see above); re-run in 30 s."
else
    echo "NOT YET  the site does not serve this checkout's release ${LOCAL:-?} yet (deploys take ~1-2 min after the push; re-run in 30 s)."
fi
exit 1
