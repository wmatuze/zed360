[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ConnectionUri
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentTemplate = Join-Path $projectRoot '.env.example'
$environmentFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $environmentTemplate)) {
    throw 'The .env.example template was not found.'
}

Write-Host ''
Write-Host 'Zed360 managed database setup' -ForegroundColor Cyan
Write-Host 'The database password will be hidden and will not be printed back.'
Write-Host ''

$connectionPointer = [IntPtr]::Zero
$passwordPointer = [IntPtr]::Zero

try {
    if ([string]::IsNullOrWhiteSpace($ConnectionUri)) {
        $secureConnection = Read-Host 'Session pooler URI' -AsSecureString
        $connectionPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConnection)
        $connectionString = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($connectionPointer)
    }
    else {
        $connectionString = $ConnectionUri.Trim().Trim("'").Trim('"')
    }

    if ([string]::IsNullOrWhiteSpace($connectionString)) {
        throw 'No connection string was entered.'
    }

    if (-not $connectionString.StartsWith('postgresql://', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'The value must begin with postgresql://.'
    }

    if ($connectionString.Contains('[YOUR-PASSWORD]') -or $connectionString.Contains('YOUR_PASSWORD')) {
        $securePassword = Read-Host 'Database password' -AsSecureString
        $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        $databasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

        if ([string]::IsNullOrWhiteSpace($databasePassword)) {
            throw 'No database password was entered.'
        }

        $encodedPassword = [Uri]::EscapeDataString($databasePassword)
        $connectionString = $connectionString.Replace('[YOUR-PASSWORD]', $encodedPassword)
        $connectionString = $connectionString.Replace('YOUR_PASSWORD', $encodedPassword)
    }

    if ($connectionString -notmatch '[?&]sslmode=') {
        $separator = if ($connectionString.Contains('?')) { '&' } else { '?' }
        $connectionString = "$connectionString${separator}sslmode=require"
    }

    $environmentContent = Get-Content -Raw -LiteralPath $environmentTemplate
    $environmentContent = [regex]::Replace(
        $environmentContent,
        '(?m)^DATABASE_URL=.*$',
        "DATABASE_URL=$connectionString"
    )
    $environmentContent = [regex]::Replace(
        $environmentContent,
        '(?m)^DATABASE_MIGRATION_URL=.*$',
        "DATABASE_MIGRATION_URL=$connectionString"
    )

    [IO.File]::WriteAllText($environmentFile, $environmentContent, [Text.UTF8Encoding]::new($false))

    Write-Host ''
    Write-Host 'Database connection saved securely to .env.' -ForegroundColor Green
    Write-Host 'The connection string was not displayed.'
}
finally {
    if ($connectionPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($connectionPointer)
    }

    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }

    $connectionString = $null
    $databasePassword = $null
    $encodedPassword = $null
    $secureConnection = $null
    $securePassword = $null
}
