$dllPath = Join-Path $PWD "inspiration_repo\RED MC\Parsers.dll"

if (-Not (Test-Path $dllPath)) {
    Write-Host "DLL not found at: $dllPath"
    exit
}

[Reflection.Assembly]::LoadFile($dllPath) | Out-Null

$assembly = [AppDomain]::CurrentDomain.GetAssemblies() | Where-Object { $_.Location -eq $dllPath }
if (-Not $assembly) {
    Write-Host "Failed to load Parsers.dll"
    exit
}

Write-Host "--- Parsers.dll Loaded ---"

$types = $assembly.GetTypes()
Write-Host "Found $($types.Count) types in assembly."

# Just print the first 50 type names to see the structure of the classes inside RED MC
$count = 0
foreach ($type in $types) {
    if ($count -lt 50) {
        Write-Host "Type: $($type.FullName)"
    }
    
    # Check if this type has the word "Player" or "Roster" or "Tendency" or "Offset"
    if ($type.FullName -match "Player" -or $type.FullName -match "Roster" -or $type.FullName -match "NBA2K14") {
        Write-Host "  ---> MATCHED HIGH PRIORITY TYPE: $($type.FullName)"
    }
    
    $count++
}

Write-Host "`nSearching for size properties..."
foreach ($type in $types) {
    if ($type.Name -match "Player") {
        $props = $type.GetProperties()
        foreach ($prop in $props) {
            if ($prop.Name -match "Size" -or $prop.Name -match "Length" -or $prop.Name -match "Offset") {
                Write-Host "[$($type.Name)] $($prop.Name) -> $($prop.PropertyType.Name)"
            }
        }
        $fields = $type.GetFields([System.Reflection.BindingFlags]::Public -bor [System.Reflection.BindingFlags]::NonPublic -bor [System.Reflection.BindingFlags]::Static -bor [System.Reflection.BindingFlags]::Instance)
        foreach ($field in $fields) {
            if ($field.Name -match "Size" -or $field.Name -match "Length" -or $field.Name -match "Offset") {
                Write-Host "[$($type.Name)] Field: $($field.Name) -> Type: $($field.FieldType.Name)"
            }
        }
    }
}
