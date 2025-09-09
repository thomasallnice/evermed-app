# PDF Extractor (Cloud Run)

A minimal HTTP service that extracts text from documents:
- PDFs → Poppler's `pdftotext`, with OCR fallback via `ocrmypdf` + `tesseract-ocr` for scanned PDFs
- Images (PNG/JPEG) → `tesseract-ocr`

- POST `/extract` with `Content-Type: application/pdf` (raw bytes)
- Returns JSON `{ "text": "..." }` (UTF-8)
- Optional Bearer auth via `EXTRACT_BEARER` env var

## Local run

```
# Build image locally
docker build -t pdf-extractor:latest .

# Run locally on 8080
docker run --rm -p 8080:8080 pdf-extractor:latest

# Test
# PDF
curl -sS -H 'Content-Type: application/pdf' --data-binary @sample.pdf http://127.0.0.1:8080/extract | jq .
# Image (PNG/JPEG)
curl -sS -H 'Content-Type: image/png' --data-binary @sample.png http://127.0.0.1:8080/extract | jq .
```

## Deploy to Cloud Run (Artifact Registry)

Prereqs:
- `gcloud` installed and authenticated
- Project selected: `gcloud config set project <PROJECT_ID>`
- Enable APIs:
  ```bash
  gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
  ```

Create Artifact Registry (once):
```bash
gcloud artifacts repositories create containers \
  --repository-format=docker \
  --location=us-central1 \
  --description="Container registry"
```

Build & Push:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/<PROJECT_ID>/containers/pdf-extractor:latest
```

Deploy:
```bash
gcloud run deploy pdf-extractor \
  --image us-central1-docker.pkg.dev/<PROJECT_ID>/containers/pdf-extractor:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 3 \
  --memory 512Mi \
  --set-env-vars EXTRACT_BEARER="your-secret-token"
```

(optional) Require authentication:
- Remove `--allow-unauthenticated` and put the service behind IAM.
- Or keep unauthenticated and require `EXTRACT_BEARER` header value.

## Configure the app

In `app/.env.local` (or Vercel envs):

```
PDF_EXTRACT_URL=https://pdf-extractor-<hash>-uc.a.run.app/extract
PDF_EXTRACT_BEARER=your-secret-token
PDF_EXTRACT_TIMEOUT_MS=20000
PDF_USE_PDFJS_FALLBACK=false
```

The app will POST PDF bytes to the extractor only if local parsers return no text.

## Notes
- The image installs: `poppler-utils`, `tesseract-ocr`, `ocrmypdf`, `qpdf`, `ghostscript`.
- Flow: PDFs use `pdftotext`, fallback to `ocrmypdf`; images use `tesseract` directly.
- Keep a sensible timeout (`pdftotext` ~18s, OCR ~45s images ~25s). Very large inputs should be size‑capped upstream.
