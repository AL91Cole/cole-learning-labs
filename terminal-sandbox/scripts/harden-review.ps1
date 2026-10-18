param([Parameter(Mandatory=$true)][string]$LiteralPath)
$ErrorActionPreference = 'Stop'
$directory = [IO.DirectoryInfo]::new($LiteralPath)
if (-not $directory.Exists -or $directory.Name -ne '.review' -or ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Invalid private review directory.' }
$entries = @($directory.GetFileSystemInfos())
foreach ($entry in $entries) {
    if (($entry.Attributes -band [IO.FileAttributes]::Directory) -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Unexpected private review entry.' }
}
$current = [Security.Principal.WindowsIdentity]::GetCurrent().User
$system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
function Set-PrivateAcl($Item, [bool]$IsDirectory) {
    $ownerBefore = $Item.GetAccessControl().GetOwner([Security.Principal.SecurityIdentifier])
    if ($ownerBefore.Value -ne $current.Value) { throw 'Private review paths must already be owned by the current user.' }
    if ($IsDirectory) {
        $acl = [Security.AccessControl.DirectorySecurity]::new()
        $inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    } else {
        $acl = [Security.AccessControl.FileSecurity]::new()
        $inherit = [Security.AccessControl.InheritanceFlags]::None
    }
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($identity in @($current, $system)) {
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, [Security.AccessControl.FileSystemRights]::FullControl, $inherit, [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
        $acl.AddAccessRule($rule)
    }
    $Item.SetAccessControl($acl)
    $verified = $Item.GetAccessControl()
    if ($verified.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $current.Value) { throw 'Private review ownership changed unexpectedly.' }
    if (-not $verified.AreAccessRulesProtected) { throw 'Private access inheritance remains enabled.' }
    $rules = @($verified.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
    foreach ($rule in $rules) {
        if ($rule.IdentityReference.Value -notin @($current.Value, $system.Value) -or $rule.AccessControlType -ne 'Allow' -or $rule.IsInherited -or $rule.FileSystemRights -ne [Security.AccessControl.FileSystemRights]::FullControl) { throw 'Unexpected private access rule.' }
    }
    if ($rules.Count -ne 2) { throw 'Expected private access rules were not retained.' }
}
Set-PrivateAcl $directory $true
foreach ($entry in $entries) { Set-PrivateAcl $entry $false }
