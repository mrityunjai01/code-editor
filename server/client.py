import uuid


class Client:
    def __init__(self, websocket, name):
        self.client_id = str(uuid.uuid4())
        self.name = name
        self.ws = websocket