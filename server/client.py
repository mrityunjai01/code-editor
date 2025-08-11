import uuid


class Client:
    def __init__(self, websocket, name, client_room, client_id=None):
        self.client_id = str(uuid.uuid4()) if client_id is None else client_id
        self.name = name
        self.client_room = client_room
        self.ws = websocket
