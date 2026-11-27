import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models.schemas import ProcessVoiceRequest, ConfirmActionRequest, VoiceInteraction, ApiResponse
from app.services.nlp_parser import NLPParser
from app.services.business_logic import BusinessService
from app.database.db import get_db_connection

router = APIRouter(prefix="/api/voice", tags=["Voice Assistant"])

@router.post("/process", response_model=ApiResponse)
def process_voice_command(request: ProcessVoiceRequest):
    """
    Receives user voice speech transcript, detects intent, extracts structured entities,
    and stages an action requiring user confirmation.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    # Parse using Multilingual NLP Parser
    parsed = NLPParser.parse(request.transcript, request.language)

    interaction_id = f"vact_{uuid.uuid4().hex[:10]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    initial_status = "pending_confirmation" if parsed["confirmation_required"] else "info"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO voice_interactions 
        (id, transcript, detected_intent, language, extracted_data, confirmation_required, confirmation_prompt, spoken_response, execution_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        interaction_id,
        request.transcript,
        parsed["intent"],
        request.language,
        json.dumps(parsed["extracted_data"]),
        1 if parsed["confirmation_required"] else 0,
        parsed["confirmation_prompt"],
        parsed["spoken_response"],
        initial_status,
        now
    ))
    conn.commit()
    conn.close()

    response_payload = {
        "interaction_id": interaction_id,
        "transcript": request.transcript,
        "intent": parsed["intent"],
        "language": request.language,
        "extracted_data": parsed["extracted_data"],
        "confirmation_required": parsed["confirmation_required"],
        "confirmation_prompt": parsed["confirmation_prompt"],
        "spoken_response": parsed["spoken_response"],
        "status": initial_status,
    }

    return ApiResponse(
        success=True,
        message="Voice command parsed successfully",
        data=response_payload
    )

@router.post("/confirm", response_model=ApiResponse)
def confirm_voice_action(request: ConfirmActionRequest):
    """
    Confirms and executes the pending voice action, or cancels it.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM voice_interactions WHERE id = ?", (request.interaction_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Voice interaction not found")

    intent = row["detected_intent"]
    language = row["language"]
    extracted_data = json.loads(row["extracted_data"])

    # If edits were passed during confirmation review
    if request.edited_data:
        extracted_data.update(request.edited_data)

    if not request.confirmed:
        # User cancelled action
        cursor.execute(
            "UPDATE voice_interactions SET execution_status = 'cancelled', spoken_response = ? WHERE id = ?",
            ("Action cancelled.", request.interaction_id)
        )
        conn.commit()
        conn.close()
        
        cancel_msg = "Action cancelled. No changes were made."
        if "gu" in language:
            cancel_msg = "ઓર્ડર રદ કરવામાં આવ્યો છે. કોઈ ફેરફાર થયો નથી."
        elif "hi" in language:
            cancel_msg = "ऑर्डर रद्द कर दिया गया है। कोई बदलाव नहीं किया गया।"

        return ApiResponse(
            success=True,
            message="Action cancelled by user",
            data={
                "status": "cancelled",
                "spoken_response": cancel_msg
            }
        )

    # Execute action
    result_data, spoken_response = BusinessService.execute_confirmed_action(intent, extracted_data, language)

    # Mark interaction as executed
    cursor.execute(
        "UPDATE voice_interactions SET execution_status = 'executed', spoken_response = ? WHERE id = ?",
        (spoken_response, request.interaction_id)
    )
    conn.commit()
    conn.close()

    return ApiResponse(
        success=True,
        message="Voice action confirmed and executed successfully",
        data={
            "status": "executed",
            "executed_result": result_data,
            "spoken_response": spoken_response
        }
    )

@router.get("/history", response_model=ApiResponse)
def get_voice_history(limit: int = 15):
    """
    Fetches past voice interactions and transcripts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM voice_interactions ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    
    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "transcript": r["transcript"],
            "intent": r["detected_intent"],
            "language": r["language"],
            "extracted_data": json.loads(r["extracted_data"]),
            "confirmation_prompt": r["confirmation_prompt"],
            "spoken_response": r["spoken_response"],
            "status": r["execution_status"],
            "created_at": r["created_at"],
        })
    conn.close()

    return ApiResponse(
        success=True,
        message="Voice history fetched",
        data=history
    )
