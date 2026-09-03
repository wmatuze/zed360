[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$environmentPath = Join-Path $workspaceRoot '.env'

if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
    throw 'The root .env file does not exist. Configure the project environment first.'
}

$bytes = New-Object byte[] 48
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $generator.GetBytes($bytes)
}
finally {
    $generator.Dispose()
}
$secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$content = Get-Content -Raw -LiteralPath $environmentPath
$entry = "INTERNAL_API_SECRET=$secret"

if ($content -match '(?m)^INTERNAL_API_SECRET=.*$') {
    $content = [regex]::Replace($content, '(?m)^INTERNAL_API_SECRET=.*$', $entry)
}
else {
    $content = "$($content.TrimEnd())`r`n$entry`r`n"
}

[IO.File]::WriteAllText(
    $environmentPath,
    $content,
    (New-Object Text.UTF8Encoding($false))
)

$secret = $null
[Array]::Clear($bytes, 0, $bytes.Length)

Write-Host 'Internal business-access secret configured. Its value was not displayed.' -ForegroundColor Green
Write-Host 'Now run: pnpm.cmd auth:sync-env'
