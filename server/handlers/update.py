import json
from logger import update_logger


async def handle_update(websocket, message, state, client):
    """Handle document update with Delta format"""
    deltas = message.get("deltas", [])
    update_logger.log_message_received(
        "update", client.client_id, {"delta_count": len(deltas), "deltas": deltas}
    )

    # Assign message IDs and store deltas using centralized state
    message_ids = []
    for delta in deltas:
        delta["client_id"] = client.client_id
        message_id = state.add_delta(client.room_id, delta)
        message_ids.append(message_id)

    update_logger.log_delta_processing(client.client_id, len(deltas), message_ids)

    # Broadcast deltas to all other clients in the room
    response = {"type": "update", "deltas": deltas, "client_id": client.client_id}

    recipients = 0
    room_clients = state.get_room_clients(client.room_id)
    for room_client in room_clients:
        if room_client.ws != websocket:  # Don't send back to sender
            state.queue_message(json.dumps(response), room_client.client_id)

    update_logger.log_message_sent(
        "update",
        recipients,
        {"delta_count": len(deltas), "client_id": client.client_id},
    )
