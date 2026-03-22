$service = Get-CimInstance Win32_Service -Filter "Name='Cloudflared'"
$path = $service.PathName
if ($path -match '(ey[A-Za-z0-9-_=.]+)') {
    Set-Content -Path "C:\Users\Marcos\token.txt" -Value $matches[1]
}
