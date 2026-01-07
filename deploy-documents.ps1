# Document Generation Deployment Script
# Run this script to deploy all edge functions at once

Write-Host "Deploying Document Generation Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Change to project directory
Set-Location "c:\Users\OMEN 16\repos\TRALO"

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Deploy each function
$functions = @(
    "generate-invoice",
    "generate-waybill",
    "generate-proforma-invoice",
    "generate-receipt"
)

$deployed = 0
$failed = 0

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Yellow
    
    $result = supabase functions deploy $func 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   SUCCESS: $func deployed!" -ForegroundColor Green
        $deployed++
    } else {
        Write-Host "   FAILED: $func deployment failed!" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Gray
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "   Successful: $deployed" -ForegroundColor Green
Write-Host "   Failed: $failed" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test invoice generation in Documents page" -ForegroundColor White
    Write-Host "2. Test waybill generation in Documents page" -ForegroundColor White
    Write-Host "3. Test proforma invoice in Documents page" -ForegroundColor White
    Write-Host "4. Test receipt generation in Sales page" -ForegroundColor White
    Write-Host ""
    Write-Host "See DOCUMENT_GENERATION_FIX.md for detailed testing guide" -ForegroundColor Yellow
} else {
    Write-Host "Some deployments failed. Please check errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Cyan
    Write-Host "- Not logged in: Run 'supabase login'" -ForegroundColor White
    Write-Host "- Not linked: Run 'supabase link --project-ref YOUR_PROJECT_REF'" -ForegroundColor White
    Write-Host "- Network issues: Check internet connection" -ForegroundColor White
}

Write-Host ""
