import json
from logger import input_logger

async def handle_input_request(websocket, message, state, client):
    """Handle input message requesting document state from a specific message ID"""
    requested_message_id = message.get("last_message_id", 0)
    
    input_logger.log_message_received("input_request", client.client_id, {
        "last_message_id": requested_message_id
    })
    
    # Get deltas since the requested message ID using centralized state
    recent_deltas = state.get_deltas_since(client.room_id, requested_message_id)
    last_message_id = state.get_last_message_id(client.room_id)
    
    input_logger.log_room_state(
        client.room_id, 
        state.get_client_count(client.room_id), 
        state.get_delta_count(client.room_id)
    )
    
    response = {
        "type": "input_response",
        "deltas": recent_deltas,
        "last_message_id": last_message_id
    }
    
    try:
        state.queue_message(json.dumps(response), client.client_id)
        input_logger.log_message_sent("input_response", 1, {
            "delta_count": len(recent_deltas),
            "last_message_id": last_message_id
        })
    except Exception as e:
        input_logger.log_error(f"Failed to queue input response to client {client.client_id}", e)

async def handle_initial_dump_request(websocket, message, state, client):
    """Handle request for initial document dump"""
    input_logger.log_message_received("initial_dump_request", client.client_id)
    
    # Get document content from centralized state
    document = state.get_document(client.room_id)
    
    # Set default content if empty
    if not document.content:
        default_content = "def main():\n    print('Hello, world!')\nif __name__ == '__main__':\n    main()"
        state.set_document_content(client.room_id, default_content)
        document = state.get_document(client.room_id)
    
    response = {
        "type": "initial_dump",
        "content": document.content,
        "last_message_id": document.last_message_id
    }
    
    try:
        state.queue_message(json.dumps(response), client.client_id)
        input_logger.log_message_sent("initial_dump", 1, {
            "content_length": len(document.content),
            "last_message_id": document.last_message_id
        })
    except Exception as e:
        input_logger.log_error(f"Failed to queue initial dump to client {client.client_id}", e)