import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.models.schemas import ProcessVoiceRequest, ConfirmActionRequest, VoiceInteraction, ApiResponse
from app.services.agent import VoiceAgent
from app.services.replies import money
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

    # Vaani understands the sentence (with conversation memory) and prepares the reply
    parsed = VoiceAgent.handle(request.transcript, request.language, request.context)
    spoken_response = parsed["spoken_response"]

    conn = get_db_connection()
    cursor = conn.cursor()

    if parsed["intent"] == "list_orders":
        cursor.execute("SELECT customer_name, total_amount FROM orders WHERE status = 'pending' LIMIT 3")
        pending_rows = cursor.fetchall()
        if pending_rows:
            names = ", ".join([r["customer_name"] for r in pending_rows])
            tot_pending = money(sum([r["total_amount"] for r in pending_rows]))
            if "gu" in request.language:
                spoken_response = f"તમારા {len(pending_rows)} ઓર્ડર બાકી છે: {names}, કુલ {tot_pending}."
            elif "hi" in request.language:
                spoken_response = f"आपके {len(pending_rows)} ऑर्डर पेंडिंग हैं: {names}, कुल {tot_pending}।"
            else:
                spoken_response = f"You have {len(pending_rows)} pending orders for {names}, totaling {tot_pending}."
        else:
            if "gu" in request.language:
                spoken_response = "હાલમાં કોઈ પેન્ડિંગ ઓર્ડર નથી. બધા ઓર્ડર કમ્પ્લીટ છે!"
            elif "hi" in request.language:
                spoken_response = "फिलहाल कोई पेंडिंग ऑर्डर नहीं है। सभी ऑर्डर्स पूरे हो चुके हैं!"
            else:
                spoken_response = "You have no pending orders right now. Everything is up to date!"

    interaction_id = f"vact_{uuid.uuid4().hex[:10]}"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    initial_status = "pending_confirmation" if parsed["confirmation_required"] else "info"
    executed_result = None

    if request.auto_execute and parsed["confirmation_required"]:
        try:
            executed_result, spoken_response = BusinessService.execute_confirmed_action(
                parsed["intent"], parsed["extracted_data"], request.language
            )
        except ValueError as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))
        initial_status = "executed"

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
        spoken_response,
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
        "spoken_response": spoken_response,
        "status": initial_status,
        "executed_result": executed_result,
        "context": parsed.get("context") or {},
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

    # Never execute the same voice action twice (a spoken "yes" and a button tap can race)
    if row["execution_status"] != "pending_confirmation":
        conn.close()
        raise HTTPException(status_code=409, detail=f"This action is already {row['execution_status']}")

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
        
        cancel_msg = "Okay, cancelled. Nothing was saved."
        if "gu" in language:
            cancel_msg = "સારું, રદ કર્યું. કંઈ સેવ નથી થયું."
        elif "hi" in language:
            cancel_msg = "ठीक है, रद्द कर दिया। कुछ सेव नहीं हुआ।"

        return ApiResponse(
            success=True,
            message="Action cancelled by user",
            data={
                "status": "cancelled",
                "spoken_response": cancel_msg
            }
        )

    # Execute action
    try:
        result_data, spoken_response = BusinessService.execute_confirmed_action(intent, extracted_data, language)
    except ValueError as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))

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
