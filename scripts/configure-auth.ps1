[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentTemplate = Join-Path $projectRoot '.env.example'
$environmentFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $environmentTemplate)) {
    throw 'The .env.example template was not found.'
}

Write-Host ''
Write-Host 'Zed360 Supabase Auth setup' -ForegroundColor Cyan
Write-Host 'Use the Project URL and publishable key from the Supabase Connect dialog.'
Write-Host 'Do not use or paste a secret key or service-role key.' -ForegroundColor Yellow
Write-Host ''

$keyPointer = [IntPtr]::Zero

try {
    $projectUrl = (Read-Host 'Supabase Project URL').Trim().TrimEnd('/')
    if ($projectUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co$') {
        throw 'The Project URL must look like https://your-project-ref.supabase.co.'
    }

    $secureKey = Read-Host 'Supabase publishable key' -AsSecureString
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $publishableKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)

    if (
        -not $publishableKey.StartsWith('sb_publishable_') -and
        -not $publishableKey.StartsWith('eyJ')
    ) {
        throw 'Use a publishable key (sb_publishable_...) or legacy anon key, never a secret key.'
    }

    $environmentContent = if (Test-Path -LiteralPath $environmentFile) {
        Get-Content -Raw -LiteralPath $environmentFile
    }
    else {
        Get-Content -Raw -LiteralPath $environmentTemplate
    }

    foreach ($entry in @{
        NEXT_PUBLIC_SUPABASE_URL = $projectUrl
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $publishableKey
    }.GetEnumerator()) {
        $pattern = "(?m)^$([regex]::Escape($entry.Key))=.*$"
        $line = "$($entry.Key)=$($entry.Value)"
        if ($environmentContent -match $pattern) {
            $environmentContent = [regex]::Replace($environmentContent, $pattern, $line)
        }
        else {
            $environmentContent = "$environmentContent`r`n$line"
        }
    }

    [IO.File]::WriteAllText(
        $environmentFile,
        $environmentContent,
        [Text.UTF8Encoding]::new($false)
    )

    Write-Host ''
    Write-Host 'Supabase Auth settings saved to .env.' -ForegroundColor Green
    Write-Host 'Restart the Zed360 development command before testing sign-in.'
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }

    $publishableKey = $null
    $secureKey = $null
}
