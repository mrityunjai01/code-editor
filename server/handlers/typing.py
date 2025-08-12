import json
from logger import typing_logger
from messages.responses import TypingResponse


async def handle_typing_indicator(websocket, message, state, client):
    # Broadcast typing status to all other clients in the room
    typing_status = message.is_typing  # boolean attribute access

    typing_logger.log_message_received(
        "typing_indicator", client.client_id, {"typing": typing_status}
    )

    # Broadcast cursor position to all other clients in the room
    response = TypingResponse(
        client_id=client.client_id,
        typing=typing_status,
    ).model_dump()
    recipients = 0
    room_clients = state.get_room_clients(client.client_room)
    for room_client in room_clients:
        if room_client.client_id != client.client_id:  # Don't send back to sender
            try:
                state.queue_message(json.dumps(response), room_client.client_id)
                recipients += 1
            except Exception as e:
                typing_logger.log_error(
                    f"Failed to queue typing update to client {room_client.client_id}",
                    e,
                )

    typing_logger.log_message_sent(
        "typing_indicator",
        recipients,
        {"client_id": client.client_id, "typing": typing_status},
    )

