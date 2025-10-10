# Vault Preview Manual Testing Guide

**Date**: 2025-10-09
**Environment**: Local Development
**Feature**: DocumentPreview Component Integration

## Overview

This guide provides step-by-step instructions for manually validating the DocumentPreview component on the vault page.

## Prerequisites

- Dev server running on http://localhost:3000
- Test account: `1@1.com` / `11111111`
- At least one uploaded document (preferably multiple types: images, PDFs, notes)

## Test Checklist

### 1. Login and Navigation

- [ ] Navigate to http://localhost:3000/login
- [ ] Enter credentials: `1@1.com` / `11111111`
- [ ] Click "Sign In"
- [ ] Verify successful redirect to /vault or onboarding flow
- [ ] If redirected to onboarding, complete it to create Person record
- [ ] Navigate to /vault

### 2. DocumentPreview Component Rendering

For each document card visible on the vault page:

#### Image Documents (`kind: "image"`)
- [ ] **Preview Container**: Verify `aspect-video` div is present (16:9 aspect ratio)
- [ ] **Loading State**: Check for loading skeleton with gray background and image icon (if images are loading slowly)
- [ ] **Image Rendering**: Verify Next.js `<Image>` component renders with signed URL
- [ ] **Aspect Ratio**: Confirm image maintains 16:9 aspect ratio with `object-cover` class
- [ ] **Image Loading**: Ensure image loads from Supabase signed URL
- [ ] **Error Fallback**: If image fails to load, verify icon fallback appears (🖼️)

#### PDF Documents (`kind: "pdf"`)
- [ ] **Icon Fallback**: Verify PDF icon emoji (📄) is displayed
- [ ] **Aspect Ratio**: Confirm preview container maintains 16:9 aspect ratio
- [ ] **Label**: Check "PDF Document" label appears below icon
- [ ] **No Image Element**: Confirm no `<img>` tag is present (only icon fallback)

#### Note Documents (`kind: "note"`)
- [ ] **Icon Fallback**: Verify Note icon emoji (📝) is displayed
- [ ] **Aspect Ratio**: Confirm preview container maintains 16:9 aspect ratio
- [ ] **Label**: Check "Note" label appears below icon
- [ ] **No Image Element**: Confirm no `<img>` tag is present (only icon fallback)

### 3. Console Error Validation (CRITICAL)

**Open browser DevTools (F12) → Console tab**

- [ ] **Zero Console Errors**: Verify NO `console.error()` messages appear
- [ ] **Zero Unhandled Exceptions**: Verify NO red error messages
- [ ] **Acceptable Warnings**: Log any warnings but don't block on them
- [ ] **Error on Image Load Failure**: If an image fails, check if error is logged

**BLOCKER CRITERIA**: ANY console errors = IMMEDIATE DEPLOYMENT BLOCK

### 4. Network Request Validation

**Open browser DevTools (F12) → Network tab**

- [ ] **API Endpoint**: Verify `GET /api/documents/[id]` requests for each image document
- [ ] **Status Codes**: All requests return `200 OK`
- [ ] **Response Body**: Contains `signedUrl` field with Supabase storage URL
- [ ] **No 500 Errors**: Verify no internal server errors
- [ ] **No 401/403 Errors**: Verify authentication/authorization is working

**BLOCKER CRITERIA**: ANY 500 errors = IMMEDIATE DEPLOYMENT BLOCK

### 5. Visual Regression Testing

**Capture screenshots for documentation:**

- [ ] Full vault page (grid view) - save as `vault-grid-view.png`
- [ ] Full vault page (list view) - save as `vault-list-view.png`
- [ ] Close-up of image document card - save as `image-document-preview.png`
- [ ] Close-up of PDF document card - save as `pdf-document-fallback.png`
- [ ] Close-up of note document card - save as `note-document-fallback.png`

**Save to**: `tests/screenshots/deployment-verification/vault-preview-pictures/`

### 6. Responsive Design Validation

**Test across breakpoints using DevTools Device Emulation:**

#### Mobile (375px width)
- [ ] Preview images scale correctly
- [ ] Aspect ratio maintained
- [ ] Cards stack vertically
- [ ] Touch targets minimum 44px

#### Tablet (768px width)
- [ ] Preview images scale correctly
- [ ] 2-column grid layout
- [ ] Aspect ratio maintained

#### Desktop (1024px+ width)
- [ ] Preview images scale correctly
- [ ] 3-column grid layout
- [ ] Aspect ratio maintained

### 7. Performance Validation

**Open browser DevTools (F12) → Performance tab**

- [ ] Start performance recording
- [ ] Reload /vault page (Cmd/Ctrl + R)
- [ ] Stop recording after page fully loads
- [ ] **Verify**: Page load time < 10s (per PRD NFR requirements)
- [ ] **Verify**: Images load without blocking main thread
- [ ] **Verify**: No long tasks (> 50ms)

### 8. Accessibility Validation

- [ ] **Alt Text**: Verify `<Image>` components have `alt={filename}`
- [ ] **ARIA Labels**: Check icon fallbacks have `role="img"` and `aria-label`
- [ ] **Keyboard Navigation**: Tab through document cards
- [ ] **Screen Reader**: Test with VoiceOver (Mac) or NVDA (Windows)

## Expected Results

### ✅ PASS Criteria

- All document cards display DocumentPreview component
- Image documents show preview images with 16:9 aspect ratio
- PDF/note documents show icon fallbacks with correct emojis
- Zero console errors
- All `/api/documents/[id]` requests return 200 OK
- Page loads in < 10s
- Responsive design works across all breakpoints

### ❌ FAIL Criteria (BLOCKER)

- Console errors detected
- Network requests return 500 errors
- Images fail to load (all documents)
- Aspect ratio is broken (not 16:9)
- DocumentPreview component not rendering

### ⚠️ WARNINGS (Review but don't block)

- Console warnings (not errors)
- Some images fail to load (isolated cases)
- Performance slower than baseline but < 10s

## Known Issues

- **Supabase Storage Bucket**: If images fail to load, verify storage bucket exists and RLS policies allow access
- **Signed URL Expiry**: Signed URLs expire after 60 seconds - may need refresh
- **DATABASE_URL**: If API returns errors, verify Prisma connection is configured

## Validation Report Template

```markdown
# Vault Preview Validation Report

**Date**: [YYYY-MM-DD HH:MM:SS]
**Environment**: http://localhost:3000
**Tester**: [Your Name]

## Summary

- **Overall Status**: [PASS / FAIL / BLOCKED]
- **Critical Issues**: [count]
- **Warnings**: [count]
- **Screenshots**: [path to directory]

## Test Results

### Page Accessibility
- ✅ /vault - Loaded successfully

### DocumentPreview Rendering
- ✅ Image documents: [X/Y] showing preview images
- ✅ PDF documents: [X/Y] showing icon fallbacks
- ✅ Note documents: [X/Y] showing icon fallbacks

### Console Errors (ZERO TOLERANCE)
- **Total Errors**: [count]
- **Details**: [list any errors]

### Network Requests
- ✅ GET /api/documents/[id] - [X/Y] returned 200 OK
- **Failed Requests**: [list any failures]

### Performance Metrics
- **Page Load Time**: [X]ms (threshold: 10000ms)
- **Image Load Time**: [X]ms average

### Responsive Design
- ✅ Mobile (375px): All previews render correctly
- ✅ Tablet (768px): All previews render correctly
- ✅ Desktop (1024px+): All previews render correctly

## Production Readiness Verdict

**[PASS / BLOCKED]** - [Explanation]

### Action Required (if BLOCKED):
- [ ] [Action item 1]
- [ ] [Action item 2]

### Screenshots
- [Link to screenshot directory]
```

## Troubleshooting

### Images Not Loading

1. **Check Supabase Storage Bucket**:
   - Login to Supabase dashboard
   - Navigate to Storage
   - Verify bucket exists
   - Check RLS policies allow authenticated access

2. **Check Signed URL API**:
   - Open DevTools → Network tab
   - Filter for `/api/documents/`
   - Verify response contains `signedUrl` field
   - Copy signed URL and test in new tab

3. **Check Browser Console**:
   - Look for CORS errors
   - Look for 404 errors (file not found)
   - Look for 403 errors (permission denied)

### Console Errors

1. **TypeError: Cannot read property 'id' of undefined**:
   - Check if `doc.person` is null
   - Verify Person record exists for document

2. **Image failed to load**:
   - Check if file exists in Supabase storage
   - Verify signed URL is valid
   - Check if RLS policies are active

### Performance Issues

1. **Slow page load (> 10s)**:
   - Check number of documents (lazy loading may help)
   - Verify images are optimized
   - Check network throttling is disabled

2. **Images loading slowly**:
   - Verify Next.js Image optimization is working
   - Check Supabase storage performance
   - Consider CDN for image delivery

## Next Steps

After completing this manual validation:

1. Save screenshots to `tests/screenshots/deployment-verification/vault-preview-pictures/`
2. Document any issues in validation report
3. If PASS: Proceed with PR creation
4. If BLOCKED: Fix critical issues and re-test
5. Update `.claude/memory/recent-changes.md` with validation results
