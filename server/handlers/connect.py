import json
from client import Client

async def handle_connect(websocket, message, rooms):
    room_id = message["room_id"]
    name = message.get("name", "Anonymous")
    client = Client(websocket, name)
    rooms[room_id].append(client)
    
    # Send client_id back to the connecting client
    await websocket.send_text(json.dumps({
        "type": "connect_ack",
        "client_id": client.client_id,
        "room_id": room_id
    }))
    
    return room_id