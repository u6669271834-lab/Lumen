param(
    [switch]$SkipDoctor
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $projectRoot

try {
    if (-not (Get-Command hermes -ErrorAction SilentlyContinue)) {
        throw "Hermes command was not found. Run scripts/setup-hermes-pilot.ps1 first, then open a new PowerShell window."
    }

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "Git command was not found. The pilot refuses to run without branch verification."
    }

    $branch = (git branch --show-current).Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) {
        throw "Could not determine the current Git branch."
    }

    if ($branch -eq "main") {
        throw "Hermes pilot must not run on main. Checkout experiment/hermes-pilot first."
    }

    if (-not (Test-Path ".hermes.md")) {
        throw "Pilot context file .hermes.md is missing."
    }

    $outputDirectory = Join-Path $projectRoot ".hermes-pilot"
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

    if (-not $SkipDoctor) {
        Write-Host "Running Hermes diagnostics..." -ForegroundColor Cyan
        $doctorOutput = & hermes doctor 2>&1
        $doctorExitCode = $LASTEXITCODE
        $doctorOutput | Set-Content -Path (Join-Path $outputDirectory "doctor.txt") -Encoding utf8
        if ($doctorExitCode -ne 0) {
            Write-Warning "Hermes doctor reported issues. Review .hermes-pilot/doctor.txt."
        }
    }

    $prompt = @"
Follow the project pilot context from .hermes.md.
Perform the first read-only audit defined there.
Use evidence from the repository files.
Do not modify project files, install packages, contact external services, or perform Git write operations.
Return the complete report in Russian and finish with exactly one pilot verdict.
"@

    Write-Host "Starting the first Hermes audit..." -ForegroundColor Cyan
    $result = & hermes -z $prompt 2>&1
    $runExitCode = $LASTEXITCODE
    $resultPath = Join-Path $outputDirectory "first-run.md"
    $result | Set-Content -Path $resultPath -Encoding utf8

    if ($runExitCode -ne 0) {
        throw "Hermes pilot failed. Review $resultPath for details."
    }

    Write-Host "Hermes pilot completed." -ForegroundColor Green
    Write-Host "Result: $resultPath"
    Write-Host "No project files were intentionally changed by this script."
}
finally {
    Pop-Location
}
