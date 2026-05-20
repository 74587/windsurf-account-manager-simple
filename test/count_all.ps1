$files = @(
    'AccountCard.vue',
    'AccountInfoDialog.vue',
    'MainLayout.vue',
    'AddAccountDialog.vue'
)
$basePath = 'f:\Trace\TEST\windsurf\windsurf-account-manager-simple\src'

foreach ($file in $files) {
    if ($file -eq 'MainLayout.vue') {
        $p = Join-Path $basePath "views\$file"
    } else {
        $p = Join-Path $basePath "components\$file"
    }
    Write-Host "=== $file ==="
    $patterns = @('<el-tooltip', '<el-button', '<el-dialog', '<el-icon', '<el-tag', '<el-progress', '<el-form-item', '<el-input', '<el-select', '<el-tabs', '<el-radio', '<el-checkbox', '<el-table')
    foreach ($pat in $patterns) {
        $count = (Select-String -Path $p -Pattern $pat -SimpleMatch | Measure-Object).Count
        if ($count -gt 0) {
            Write-Host "$pat`t$count"
        }
    }
    Write-Host ""
}
