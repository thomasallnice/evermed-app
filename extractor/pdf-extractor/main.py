import os
import subprocess
import tempfile
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse

EXTRACT_BEARER = os.getenv("EXTRACT_BEARER", "")

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/extract")
async def extract(req: Request):
    # Optional bearer auth
    if EXTRACT_BEARER:
        auth = req.headers.get("authorization", "")
        if auth != f"Bearer {EXTRACT_BEARER}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    ctype = req.headers.get("content-type", "").lower()
    if not any(t in ctype for t in ("application/pdf", "image/jpeg", "image/png")):
        raise HTTPException(status_code=415, detail="unsupported content-type")

    data = await req.body()
    if not data:
        raise HTTPException(status_code=400, detail="empty body")

    # PDF → pdftotext; Image → tesseract; PDF fallback → ocrmypdf
    try:
        # Using temp files for stability across executors
        suffix = ".pdf" if "pdf" in ctype else (".png" if "png" in ctype else ".jpg")
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as f:
            f.write(data)
            f.flush()
            if "pdf" in ctype:
                # -layout preserves visual order better; -nopgbrk avoids page breaks; -enc UTF-8 ensures encoding
                result = subprocess.run(
                    ["pdftotext", "-layout", "-nopgbrk", "-enc", "UTF-8", f.name, "-"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    check=False,
                    timeout=18,
                )
                text = result.stdout.decode("utf-8", errors="replace").strip()
                # OCR fallback for PDFs
                if not text:
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as out_pdf, \
                         tempfile.NamedTemporaryFile(suffix=".txt", delete=True) as sidecar:
                        try:
                            ocr = subprocess.run(
                                [
                                    "ocrmypdf",
                                    "--skip-text",
                                    "--force-ocr",
                                    "--sidecar", sidecar.name,
                                    f.name,
                                    out_pdf.name,
                                ],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                check=False,
                                timeout=45,
                            )
                            try:
                                sidecar.seek(0)
                                text = sidecar.read().decode("utf-8", errors="replace").strip()
                            except Exception:
                                text = text or ""
                        except subprocess.TimeoutExpired:
                            text = text or ""
            else:
                # Image: Tesseract
                result = subprocess.run(
                    ["tesseract", f.name, "stdout", "--psm", "6"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    check=False,
                    timeout=25,
                )
                text = result.stdout.decode("utf-8", errors="replace").strip()
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="pdftotext timeout")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="pdftotext not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"extract error: {e}")

    if req.headers.get("accept", "").lower().startswith("text/plain"):
        return PlainTextResponse(text or "")
    return JSONResponse({"text": text or ""})
