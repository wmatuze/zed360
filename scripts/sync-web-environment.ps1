[CmdletBinding()]
param(
    [switch]$RestoreRootFromWeb
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $workspaceRoot '.env'
$webDirectory = Join-Path $workspaceRoot 'apps\web'
$targetPath = Join-Path $webDirectory '.env.local'

if ($RestoreRootFromWeb) {
    if (-not (Test-Path -LiteralPath $targetPath -PathType Leaf)) {
        throw 'The web .env.local file does not exist.'
    }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw 'The root .env file does not exist.'
    }

    $webValues = @{}
    foreach ($line in Get-Content -LiteralPath $targetPath) {
        if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            $webValues[$matches[1]] = $matches[2]
        }
    }

    $requiredWebNames = @(
        'NEXT_PUBLIC_APP_URL',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    )
    $missingWebNames = @($requiredWebNames | Where-Object {
        -not $webValues.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($webValues[$_])
    })
    if ($missingWebNames.Count -gt 0) {
        throw "The web environment is missing required settings: $($missingWebNames -join ', ')"
    }

    $webKey = $webValues['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
    if (-not $webKey.StartsWith('sb_publishable_') -and -not $webKey.StartsWith('eyJ')) {
        throw 'The web environment does not contain a recognised publishable key.'
    }

    $rootContent = Get-Content -Raw -LiteralPath $sourcePath
    foreach ($name in $requiredWebNames) {
        $pattern = "(?m)^$([regex]::Escape($name))=.*$"
        $replacement = "$name=$($webValues[$name])"
        if ($rootContent -match $pattern) {
            $rootContent = [regex]::Replace($rootContent, $pattern, $replacement)
        }
        else {
            $rootContent = "$rootContent`r`n$replacement"
        }
    }

    [IO.File]::WriteAllText(
        $sourcePath,
        $rootContent,
        (New-Object Text.UTF8Encoding($false))
    )
    Write-Host 'Restored public Supabase settings from apps/web/.env.local to the root .env.'
    Write-Host 'Private database and service settings were preserved.'
    return
}

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw 'The root .env file does not exist. Configure the project environment first.'
}

$requiredNames = @(
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
)
$values = @{}

foreach ($line in Get-Content -LiteralPath $sourcePath) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $values[$matches[1]] = $matches[2]
    }
}

$missing = @($requiredNames | Where-Object {
    -not $values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($values[$_])
})
if ($missing.Count -gt 0) {
    throw "The root .env is missing required web settings: $($missing -join ', ')"
}

$resolvedWorkspace = [IO.Path]::GetFullPath($workspaceRoot)
$resolvedTarget = [IO.Path]::GetFullPath($targetPath)
if (-not $resolvedTarget.StartsWith($resolvedWorkspace, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Refusing to write the web environment outside the workspace.'
}

$lines = @(
    '# Generated from the root .env by scripts/sync-web-environment.ps1.',
    '# This file is ignored by Git. Do not commit it.'
) + @($requiredNames | ForEach-Object { "$_=$($values[$_])" })

[IO.File]::WriteAllLines(
    $resolvedTarget,
    $lines,
    (New-Object Text.UTF8Encoding($false))
)

Write-Host 'Web environment configured in apps/web/.env.local.'
Write-Host "Copied settings: $($requiredNames -join ', ')"
