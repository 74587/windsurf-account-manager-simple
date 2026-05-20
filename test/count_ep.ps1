$p = 'f:\Trace\TEST\windsurf\windsurf-account-manager-simple\src\components\AccountCard.vue'
$patterns = @('<el-tooltip', '<el-button', '<el-dialog', '<el-icon', '<el-tag', '<el-progress', '<el-popover', '<el-form-item')
foreach ($pat in $patterns) {
    $count = (Select-String -Path $p -Pattern $pat -SimpleMatch | Measure-Object).Count
    Write-Host "$pat`t$count"
}
