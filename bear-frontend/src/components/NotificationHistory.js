import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  IconButton,
  Collapse,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Emergency,
  LocalFireDepartment,
  LocalHospital,
  LocalPolice,
  Home,
  AccessTime
} from '@mui/icons-material';
import { io } from 'socket.io-client';

function NotificationHistory() {
  const [notifications, setNotifications] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [, setSocket] = useState(null);

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'fire':
        return <LocalFireDepartment sx={{ fontSize: 20 }} />;
      case 'hospital':
        return <LocalHospital sx={{ fontSize: 20 }} />;
      case 'police':
        return <LocalPolice sx={{ fontSize: 20 }} />;
      default:
        return <Home sx={{ fontSize: 20 }} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'fire':
        return 'error';
      case 'hospital':
        return 'success';
      case 'police':
        return 'info';
      default:
        return 'warning';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return time.toLocaleDateString();
  };

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", { 
      transports: ["websocket"] 
    });
    
    newSocket.on("connect", () => {
      console.log("✅ Notification History Socket connected");
    });

    // Listen for new incidents
    newSocket.on('incidentCreated', ({ incident }) => {
      const notification = {
        id: Date.now(),
        incident,
        timestamp: new Date()
      };
      
      setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Emergency sx={{ color: 'error.main' }} />
          Live Notifications
          {notifications.length > 0 && (
            <Chip 
              label={notifications.length} 
              size="small" 
              color="error" 
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <IconButton onClick={handleToggle}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No recent notifications
          </Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.map((notification, index) => {
              const { incident } = notification;
              const reporterName = incident.reportedBy 
                ? `${incident.reportedBy.firstName || 'Unknown'} ${incident.reportedBy.lastName || 'User'}`
                : incident.name || 'Anonymous User';

              return (
                <ListItem key={notification.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getTypeIcon(incident.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {incident.name}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={incident.type?.charAt(0).toUpperCase() + incident.type?.slice(1)} 
                          color={getTypeColor(incident.type)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {incident.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {incident.description.length > 80 
                              ? incident.description.substring(0, 80) + '...' 
                              : incident.description
                            }
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 14 }} />
                            {formatTime(notification.timestamp)}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            👤 {reporterName}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Collapse>
    </Paper>
  );
}

export default NotificationHistory;
