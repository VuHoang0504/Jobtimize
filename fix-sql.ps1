# Tự động chuyển quyền Admin nếu chưa có
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Yêu cầu quyền Administrator. Đang mở hộp thoại xác nhận..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $MyInvocation.MyCommand.Path) -Verb RunAs
    Exit
}

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " 1. TẮT BẢN THỪA MSSQLSERVER01 (GIẢI PHÓNG RAM & CPU)..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Dừng và tắt tự khởi động các dịch vụ của MSSQLSERVER01
$extraServices = @('MSSQL$MSSQLSERVER01', 'SQLAgent$MSSQLSERVER01', 'SQLTELEMETRY$MSSQLSERVER01')
foreach ($svc in $extraServices) {
    try {
        Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
        Set-Service -Name $svc -StartupType Disabled -ErrorAction SilentlyContinue
        Write-Host " - Đã tắt dịch vụ: $svc" -ForegroundColor Yellow
    } catch {}
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " 2. CẤU HÌNH TCP/IP CỔNG 1433 CHO MSSQLSERVER CHÍNH..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Bật TCP/IP cho MSSQLSERVER chính
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp" -Name "Enabled" -Value 1 -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IPAll" -Name "TcpPort" -Value "1433" -Force
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL17.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp\IPAll" -Name "TcpDynamicPorts" -Value "" -Force

# 2. Mở Firewall cổng 1433
try {
    netsh advfirewall firewall add rule name="SQL Server 1433" dir=in action=allow protocol=TCP localport=1433 | Out-Null
} catch {}

# 3. Khởi động lại dịch vụ SQL Server chính
Write-Host "Đang khởi động lại dịch vụ SQL Server (MSSQLSERVER)..." -ForegroundColor Yellow
Restart-Service MSSQLSERVER -Force

# 4. Khởi động SQL Server Browser
try {
    Set-Service SQLBrowser -StartupType Automatic
    Start-Service SQLBrowser -ErrorAction SilentlyContinue
} catch {}

# 5. Kiểm tra lại cổng 1433
Write-Host ""
Write-Host "Kết quả kiểm tra cổng 1433:" -ForegroundColor Green
$conn = Get-NetTCPConnection -LocalPort 1433 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "✅ THÀNH CÔNG! SQL Server đang lắng nghe trên cổng 1433!" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    $conn | Format-Table LocalAddress, LocalPort, State, OwningProcess
} else {
    Write-Host "⚠️ Cổng 1433 chưa hiển thị ngay, vui lòng đợi 5 giây..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Get-NetTCPConnection -LocalPort 1433 -State Listen -ErrorAction SilentlyContinue | Format-Table LocalAddress, LocalPort, State, OwningProcess
}

Write-Host "Nhấn phím bất kỳ để đóng cửa sổ này..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
