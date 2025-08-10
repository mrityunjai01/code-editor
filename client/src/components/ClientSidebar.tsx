import React from 'react';
import './ClientSidebar.css';

interface Client {
  client_id: string;
  name: string;
  status: 'online' | 'typing' | 'idle';
  lastSeen?: Date;
}

interface ClientSidebarProps {
  clients: Client[];
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({ clients }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#28a745';
      case 'typing': return '#ffc107';
      case 'idle': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'typing': return 'Typing...';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  };

  // Demo clients if none provided
  const demoClients: Client[] = clients.length > 0 ? clients : [
    {
      client_id: '1',
      name: 'Alice Johnson',
      status: 'online',
      lastSeen: new Date()
    },
    {
      client_id: '2',
      name: 'Bob Smith',
      status: 'typing',
      lastSeen: new Date(Date.now() - 5000)
    },
    {
      client_id: '3',
      name: 'Carol Davis',
      status: 'idle',
      lastSeen: new Date(Date.now() - 300000)
    }
  ];

  return (
    <div className="client-sidebar">
      <div className="sidebar-header">
        <h3>Active Users</h3>
        <span className="client-count">{demoClients.length}</span>
      </div>
      
      <div className="clients-list">
        {demoClients.map((client) => (
          <div 
            key={client.client_id} 
            className="client-item"
            title={`${client.name} - ${getStatusText(client.status)}`}
          >
            <div className="client-avatar">
              <span className="avatar-text">
                {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
              <div 
                className="status-dot"
                style={{ backgroundColor: getStatusColor(client.status) }}
              ></div>
            </div>
            
            <div className="client-info">
              <div className="client-name">{client.name}</div>
              <div className="client-status">
                <span 
                  className="status-indicator"
                  style={{ color: getStatusColor(client.status) }}
                >
                  {getStatusText(client.status)}
                </span>
              </div>
            </div>
            
            <div className="client-actions">
              <button 
                className="action-btn"
                title="View cursor position"
              >
                👁️
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="sidebar-footer">
        <div className="connection-info">
          <div className="info-item">
            <span className="info-label">Room ID:</span>
            <span className="info-value">room-123</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSidebar;