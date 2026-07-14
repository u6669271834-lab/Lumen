param(
    [string]$HermesTag = "v2026.7.7.2"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Hermes pilot setup" -ForegroundColor Cyan
Write-Host "Pinned release: $HermesTag"
Write-Host "Install location is managed by the official Hermes installer."

if (Get-Command hermes -ErrorAction SilentlyContinue) {
    Write-Host "Hermes is already installed." -ForegroundColor Green
    hermes --version
    Write-Host "Run 'hermes model' and choose OpenAI Codex to authenticate with ChatGPT OAuth."
    exit 0
}

$installerUrl = "https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1"
Write-Host "Downloading the official installer from NousResearch/hermes-agent..."
$installerSource = Invoke-RestMethod -Uri $installerUrl
$installer = [scriptblock]::Create($installerSource)

# The official setup wizard runs after installation. For the pilot, choose
# OpenAI Codex in `hermes model` / setup so no project API key is required.
& $installer -Tag $HermesTag

Write-Host "" 
Write-Host "Installation command finished." -ForegroundColor Green
Write-Host "Open a new PowerShell window so the updated User PATH is loaded."
Write-Host "Then open projects/lumen-control and run:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\run-hermes-pilot.ps1"
