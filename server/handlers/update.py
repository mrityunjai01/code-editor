async def handle_update(websocket, message, rooms, client_room):
    if client_room:
        # Broadcast to all clients in the room
        for client in rooms[client_room]:
            if client.ws != websocket:  # Don't send back to sender
                import json
                await client.ws.send_text(json.dumps(message))