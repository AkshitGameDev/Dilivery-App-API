Param(
  [string]$Base = "https://dilivery-app-api.onrender.com",
  [string]$IdempotencyKey = "ord-live-1",
  [switch]$Fallback,
  [switch]$NoAccept
)

Write-Host "=== Using BASE:" $Base -ForegroundColor Cyan

# ---------- Health ----------
Write-Host "`n[1/6] Health checks" -ForegroundColor Yellow
try { irm "$Base/healthz" } catch { Write-Warning "healthz failed: $($_.Exception.Message)" }
try { irm "$Base/healthz/db" } catch { Write-Warning "healthz/db failed: $($_.Exception.Message)" }
try { irm "$Base/healthz/redis" } catch { Write-Warning "healthz/redis failed: $($_.Exception.Message)" }

# ---------- Import Order (auto-creates OPEN job) ----------
Write-Host "`n[2/6] Import order (auto-creates OPEN job)" -ForegroundColor Yellow
$headers = @{
  "Content-Type"    = "application/json"
  "Idempotency-Key" = $IdempotencyKey
}

$orderBody = @{
  platform = "custom"
  order = @{
    externalId = "ORD-LIVE-1"
    placedAt   = "2025-09-24T12:00:00Z"
    currency   = "CAD"
    totals     = @{ subtotal = 20; shipping = 5; tax = 0; grand = 25 }
    customer   = @{ name = "Live Cust"; email = "live@example.com"; phone = "123" }
    items      = @(@{ sku = "SKU-1"; name = "Burger"; qty = 1; price = 25 })
    job        = @{
      pickupLat = 43.653; pickupLng = -79.383
      dropoffLat = 43.645; dropoffLng = -79.380
      pickupAddress = "123 King St W"; dropoffAddress = "200 Front St W"
    }
  }
} | ConvertTo-Json -Depth 10

$importResp = $null
try {
  $importResp = irm "$Base/api/import-orders" -Method POST -Headers $headers -Body $orderBody
  $importResp | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Import failed: $($_.Exception.Message)"
}

# Try idempotency re-run
try {
  $importResp2 = irm "$Base/api/import-orders" -Method POST -Headers $headers -Body $orderBody
  $importResp2 | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Second import (idempotency) failed: $($_.Exception.Message)"
}

# Grab jobId if returned by API
$jobId = $null
if ($importResp -and $importResp.PSObject.Properties.Name -contains "jobId") {
  $jobId = $importResp.jobId
}

# ---------- Driver Heartbeat ----------
Write-Host "`n[3/6] Driver heartbeat" -ForegroundColor Yellow
$hbHeaders = @{ "Content-Type" = "application/json" }
$hbBody = @{
  driverId = "d1"
  name     = "Akshit"
  lat      = 43.653
  lng      = -79.383
  status   = "available"
} | ConvertTo-Json

try {
  $hbResp = irm "$Base/api/drivers/heartbeat" -Method POST -Headers $hbHeaders -Body $hbBody
  $hbResp | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Heartbeat failed: $($_.Exception.Message)"
}

# ---------- Available Jobs ----------
Write-Host "`n[4/6] Available jobs" -ForegroundColor Yellow
$jobs = $null
try {
  if ($Fallback.IsPresent) {
    $jobs = irm "$Base/api/jobs/available?lat=43.653&lng=-79.383&radiusKm=5"
  } else {
    $jobs = irm "$Base/api/jobs/available?driverId=d1&radiusKm=5"
  }
  $jobs | ConvertTo-Json -Depth 10
} catch {
  Write-Warning "Available jobs failed: $($_.Exception.Message)"
}

# If no jobId yet, pick first from list
if (-not $jobId -and $jobs -and $jobs.Count -gt 0) {
  $jobId = $jobs[0].id
}

if (-not $jobId) {
  Write-Warning "No jobId found to accept (either import didn't create a job or none within radius)."
}

# ---------- Accept Job ----------
if (-not $NoAccept.IsPresent -and $jobId) {
  Write-Host "`n[5/6] Accept job $jobId" -ForegroundColor Yellow
  $acceptBody = @{ driverId = "d1" } | ConvertTo-Json
  try {
    $acceptResp = irm "$Base/api/jobs/$jobId/accept" -Method POST -Headers $hbHeaders -Body $acceptBody
    $acceptResp | ConvertTo-Json -Depth 10
  } catch {
    Write-Warning "Accept failed: $($_.Exception.Message)"
  }
} else {
  Write-Host "`n[5/6] Skipping accept (NoAccept or missing jobId)" -ForegroundColor DarkYellow
}

# ---------- Verify OPEN list ----------
Write-Host "`n[6/6] Verify open list post-accept" -ForegroundColor Yellow
try {
  if ($Fallback.IsPresent) {
    irm "$Base/api/jobs/available?lat=43.653&lng=-79.383&radiusKm=5" | ConvertTo-Json -Depth 10
  } else {
    irm "$Base/api/jobs/available?driverId=d1&radiusKm=5" | ConvertTo-Json -Depth 10
  }
} catch {
  Write-Warning "Verify available jobs failed: $($_.Exception.Message)"
}

Write-Host "`nDone." -ForegroundColor Green
