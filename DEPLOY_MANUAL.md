# Manual Deployment Guide

Since Supabase CLI installation is not straightforward on your system, you have two options:

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. **Go to your Supabase project dashboard**
   - Visit https://supabase.com/dashboard
   - Select your TRALO project

2. **Navigate to Edge Functions**
   - Click "Edge Functions" in the left sidebar
   - Click "Create a new function"

3. **Deploy each function manually:**

### Deploy generate-invoice:
- Function name: `generate-invoice`
- Copy the code from: `supabase/functions/generate-invoice/index.ts`
- Paste into the editor
- Click "Deploy"

### Deploy generate-waybill:
- Function name: `generate-waybill`
- Copy the code from: `supabase/functions/generate-waybill/index.ts`
- Paste into the editor
- Click "Deploy"

### Deploy generate-proforma-invoice:
- Function name: `generate-proforma-invoice`
- Copy the code from: `supabase/functions/generate-proforma-invoice/index.ts`
- Paste into the editor
- Click "Deploy"

### Deploy generate-receipt:
- Function name: `generate-receipt`
- Copy the code from: `supabase/functions/generate-receipt/index.ts`
- Paste into the editor (update existing if it exists)
- Click "Deploy"

## Option 2: Use Supabase CLI with Docker

If you have Docker installed:

```powershell
docker run --rm -v ${PWD}:/workspace supabase/cli functions deploy generate-invoice
docker run --rm -v ${PWD}:/workspace supabase/cli functions deploy generate-waybill
docker run --rm -v ${PWD}:/workspace supabase/cli functions deploy generate-proforma-invoice
docker run --rm -v ${PWD}:/workspace supabase/cli functions deploy generate-receipt
```

## Option 3: Install Supabase CLI Properly

### Using Chocolatey (if you have it):
```powershell
choco install supabase
```

### Using Scoop (install Scoop first):
```powershell
# Install Scoop first
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Then install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Manual Binary Download:
1. Go to: https://github.com/supabase/cli/releases
2. Download the latest `supabase_windows_amd64.tar.gz`
3. Extract it
4. Add the extracted folder to your PATH
5. Run `supabase login` and `supabase link --project-ref YOUR_PROJECT_REF`
6. Then run `.\deploy-documents.ps1`

## Verification

After deployment (via any method), verify all functions are live:
1. Go to Supabase Dashboard → Edge Functions
2. You should see all 4 functions listed:
   - generate-invoice ✅
   - generate-waybill ✅
   - generate-proforma-invoice ✅
   - generate-receipt ✅

## Test the Documents

Once deployed, test in your TRALO app:

1. **Invoice**: Documents → Create Document → Invoice
2. **Waybill**: Documents → Create Document → Waybill
3. **Proforma Invoice**: Documents → Create Document → Proforma Invoice
4. **Receipt**: Sales → Record Sale (receipt auto-downloads)

Each document should:
- ✅ Download as HTML file
- ✅ Show your business branding
- ✅ Include QR code
- ✅ Have professional styling
- ✅ Print correctly

## Need Help?

If you continue having issues:
1. The easiest method is Option 1 (Dashboard deployment)
2. Each function file is ready - just copy/paste into dashboard
3. All code is in the `supabase/functions/` folder
