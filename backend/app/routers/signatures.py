from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from app.models.schemas import ApiResponse
from app.database.db import get_db_connection
from app.services import signatures

router = APIRouter(tags=["Voice Signatures"])


@router.post("/api/khata/entries/{entry_id}/signature", response_model=ApiResponse)
async def attach_signature(
    entry_id: str,
    audio: UploadFile = File(...),
    duration_ms: Optional[int] = Form(None),
    phrase: str = Form(""),
    language: str = Form("en-IN"),
):
    """Attach the customer's spoken confirmation to a khata entry."""
    data = await audio.read(signatures.MAX_AUDIO_BYTES + 1)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        meta = signatures.create_signature(
            cursor, entry_id, data, audio.content_type or "", duration_ms, phrase[:200], language[:10]
        )
        conn.commit()
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return ApiResponse(success=True, message="Voice signature saved", data=meta)


@router.get("/api/signatures/verify", response_model=ApiResponse)
def verify_signatures():
    conn = get_db_connection()
    try:
        result = signatures.verify_chain(conn.cursor())
    finally:
        conn.close()
    return ApiResponse(success=True, message="Signature chain checked", data=result)


@router.get("/api/signatures/{signature_id}/audio")
def signature_audio(signature_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT audio, mime_type, audio_sha256 FROM voice_signatures WHERE id = ?", (signature_id,))
        row = cursor.fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Signature not found")
    return Response(
        content=row["audio"],
        media_type=row["mime_type"].split(";")[0],
        headers={"Cache-Control": "private, max-age=86400", "X-Audio-SHA256": row["audio_sha256"]},
    )
