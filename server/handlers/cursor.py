import json
from logger import cursor_logger
from messages.responses import CursorResponse


async def handle_cursor_update(websocket, message, state, client):
    """Handle cursor position update from client"""
    # Extract cursor position from validated message using attribute access
    line = message.ln
    column = message.pos

    cursor_logger.log_message_received(
        "cursor_update",
        client.client_id,
        {"position": {"line": line, "column": column}},
    )

    # Broadcast cursor position to all other clients in the room
    response = CursorResponse(
        type="cursor_update",
        ln=line,
        pos=column,
        client_id=client.client_id,
    ).model_dump()

    recipients = 0
    room_clients = state.get_room_clients(client.client_room)
    for room_client in room_clients:
        if room_client.client_id != client.client_id:  # Don't send back to sender
            try:
                state.queue_message(json.dumps(response), room_client.client_id)
                recipients += 1
            except Exception as e:
                cursor_logger.log_error(
                    f"Failed to queue cursor update to client {room_client.client_id}",
                    e,
                )

    cursor_logger.log_message_sent(
        "cursor_update",
        recipients,
        {"client_id": client.client_id, "position": {"line": line, "column": column}},
    )
