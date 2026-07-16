param(
    [switch]$Force
)

# Git Checks
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Error "Git is not installed or not in system PATH."; exit 1 }
if ((git rev-parse --is-inside-work-tree 2>$null) -ne "true") { Write-Error "This folder is not a Git repository. Run 'git init'."; exit 1 }
if (-not (git remote get-url origin 2>$null)) { Write-Error "No remote repository 'origin' configured."; exit 1 }
git ls-remote origin -h HEAD >$null 2>&1; if ($LASTEXITCODE -ne 0) { Write-Error "Cannot connect to the remote repository."; exit 1 }

if ($Force) {
    Write-Host "=== FORCE PUSHING TO GITHUB ===" -ForegroundColor Red
    git add -A
    git commit -m "Sync from $env:COMPUTERNAME ($env:USERNAME) [FORCE]" >$null 2>&1
    git push -f origin main
    Write-Host "Total files received from GitHub: 0 (Force push)" -ForegroundColor Cyan
    Write-Host "Total files sent to GitHub: All local files (Force push)" -ForegroundColor Cyan
    Write-Host "GitHub overwritten successfully!" -ForegroundColor Green
    exit 0
}

Write-Host "=== OUTGOING SYNCHRONIZATION (PUSH) ===" -ForegroundColor Cyan

# Add and commit locally
git add -A
git commit -m "Sync from $env:COMPUTERNAME ($env:USERNAME)"

# Fetch remote state
git fetch origin main

# If diverging with origin/main, resolve by date
$diffs = git diff --name-only origin/main | Where-Object { $_ -ne "" }
$divergentUpdates = 0
foreach ($file in $diffs) {
    $localTime = if (Test-Path $file) { (Get-Item $file).LastWriteTimeUtc } else { [DateTime]::MinValue }
    $remoteTimeRaw = git log -1 --format=%cI origin/main -- $file
    $remoteTime = if ($remoteTimeRaw) { [DateTimeOffset]::Parse($remoteTimeRaw).UtcDateTime } else { [DateTime]::MinValue }
    
    if ($remoteTime -gt $localTime) {
        Write-Host "  -> [IMPORT] Remote is newer: $file" -ForegroundColor Yellow
        git checkout origin/main -- $file
        $divergentUpdates++
    }
}

# Realign and push
git reset origin/main
git add -A
git commit -m "Sync from $env:COMPUTERNAME ($env:USERNAME) (date resolved)" >$null 2>&1

$pushedCount = (git diff --name-only origin/main..HEAD | Where-Object { $_ -ne "" }).Count
git push origin main

Write-Host "Total files received from GitHub: $divergentUpdates" -ForegroundColor Cyan
Write-Host "Total files sent to GitHub: $pushedCount" -ForegroundColor Cyan
Write-Host "Changes pushed successfully!" -ForegroundColor Green
