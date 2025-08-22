import React from "react";
import "./ClientSidebar.css";

interface Client {
  client_id: string;
  name: string;
  status: "online" | "typing" | "idle";
  lastSeen?: Date;
}

interface ClientSidebarProps {
  clients: Client[];
}
