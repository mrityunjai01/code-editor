from starlette.applications import Starlette
from starlette.websockets import WebSocket, WebSocketDisconnect
from starlette.routing import WebSocketRoute
import json
from collections import defaultdict
from handlers.connect import handle_connect
from handlers.update import handle_update

# Store clients by room - each client is a Client object
rooms = defaultdict(list)

async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_room = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "connect":
                client_room = await handle_connect(websocket, message, rooms)
                
            elif message["type"] == "update":
                await handle_update(websocket, message, rooms, client_room)
                            
    except WebSocketDisconnect:
        if client_room:
            rooms[client_room] = [client for client in rooms[client_room] if client.ws != websocket]
            if not rooms[client_room]:
                del rooms[client_room]

routes = [
    WebSocketRoute("/ws", websocket_endpoint),
]

app = Starlette(routes=routes)