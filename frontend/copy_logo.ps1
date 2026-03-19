$src = 'C:\Users\Laptop\OneDrive\Escritorio\others\gologo-04.png'
$dst = 'd:\DragonFly\GeekStore\frontend\public\logo_source.png'
$bytes = [System.IO.File]::ReadAllBytes($src)
[System.IO.File]::WriteAllBytes($dst, $bytes)
Write-Host "Copied $($bytes.Length) bytes"
