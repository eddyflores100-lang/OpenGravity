$outfile = "C:\Users\Usuario\.gemini\antigravity\scratch\opengravity\AllCode.md"
"# OpenGravity - All Source Code`n" | Out-File -FilePath $outfile -Encoding utf8

$files = Get-ChildItem -Path "C:\Users\Usuario\.gemini\antigravity\scratch\opengravity" -Include *.ts, *.tsx, *.js, *.mjs, *.py, docker-compose.yml, *.json -Recurse | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.next\\' -and $_.FullName -notmatch '\\dist\\' -and $_.FullName -notmatch '\\.git\\' }

foreach ($f in $files) {
    "## $($f.FullName.Replace('C:\Users\Usuario\.gemini\antigravity\scratch\opengravity\', ''))`n" | Out-File -FilePath $outfile -Append -Encoding utf8
    $lang = $f.Extension.Trim('.')
    if ($lang -eq 'yml') { $lang = 'yaml' }
    if ($f.Name -eq 'docker-compose.yml') { $lang = 'yaml' }
    "````$lang`n" | Out-File -FilePath $outfile -Append -Encoding utf8
    Get-Content -Path $f.FullName -Encoding UTF8 -Raw | Out-File -FilePath $outfile -Append -Encoding utf8
    "`n`````n`n" | Out-File -FilePath $outfile -Append -Encoding utf8
}

Write-Host "Code concatenation completed."
