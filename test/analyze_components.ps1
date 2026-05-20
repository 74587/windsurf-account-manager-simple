$path = 'f:\Trace\TEST\windsurf\windsurf-account-manager-simple\src'
Get-ChildItem -Path $path -Recurse -Include *.vue | ForEach-Object {
    $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
    [PSCustomObject]@{
        Name = $_.Name
        Lines = $lines
        SizeKB = [math]::Round($_.Length / 1024, 1)
    }
} | Sort-Object Lines -Descending | Format-Table -AutoSize
