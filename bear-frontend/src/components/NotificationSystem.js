import React, { useState, useEffect, useCallback } from 'react';
import { 
  Snackbar, 
  Alert, 
  AlertTitle, 
  IconButton, 
  Typography, 
  Box,
  Chip
} from '@mui/material';
import { 
  Close, 
  Emergency, 
  LocalFireDepartment, 
  LocalHospital, 
  LocalPolice, 
  Home,
  Waves,
  Terrain
} from '@mui/icons-material';

function NotificationSystem({ socket }) {
  const [, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'fire':
        return <LocalFireDepartment sx={{ fontSize: 20 }} />;
      case 'hospital':
        return <LocalHospital sx={{ fontSize: 20 }} />;
      case 'police':
        return <LocalPolice sx={{ fontSize: 20 }} />;
      case 'earthquake':
        return <Terrain sx={{ fontSize: 20 }} />;
      case 'flood':
        return <Waves sx={{ fontSize: 20 }} />;
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
      case 'earthquake':
        return 'error';
      case 'flood':
        return 'info';
      default:
        return 'warning';
    }
  };

  // Audio elements for custom notification sounds
  const [audioElement, setAudioElement] = useState(null);
  const [resolvedAudioElement, setResolvedAudioElement] = useState(null);

  // Initialize audio elements on component mount
  useEffect(() => {
    console.log('Initializing audio elements...');
    
    // Initialize emergency alert sound
    const audio = new Audio('/sounds/bear-alert.mp3');
    audio.preload = 'auto';
    audio.volume = 0.8; // Set volume (0.0 to 1.0)
    
    // Initialize resolved chime sound
    const resolvedAudio = new Audio('/sounds/resolved_chime.mp3');
    resolvedAudio.preload = 'auto';
    resolvedAudio.volume = 0.7; // Slightly lower volume for chime
    
    // Add comprehensive error handling for emergency audio loading
    audio.addEventListener('error', (e) => {
      console.error('Emergency audio loading error:', e);
      console.error('Error details:', {
        code: e.target.error?.code,
        message: e.target.error?.message,
        networkState: e.target.networkState,
        readyState: e.target.readyState
      });
    });
    
    audio.addEventListener('canplaythrough', () => {
      console.log('Emergency alert sound loaded successfully');
    });
    
    // Add error handling for resolved audio loading
    resolvedAudio.addEventListener('error', (e) => {
      console.error('Resolved chime loading error:', e);
    });
    
    resolvedAudio.addEventListener('canplaythrough', () => {
      console.log('Resolved chime sound loaded successfully');
    });
    
    // Test if files exist
    fetch('/sounds/bear-alert.mp3', { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('Emergency sound file exists and is accessible');
        } else {
          console.error('Emergency sound file not found:', response.status);
        }
      })
      .catch(error => {
        console.error('Error checking emergency sound file:', error);
      });
      
    fetch('/sounds/resolved_chime.mp3', { method: 'HEAD' })
      .then(response => {
        if (response.ok) {
          console.log('Resolved chime file exists and is accessible');
        } else {
          console.error('Resolved chime file not found:', response.status);
        }
      })
      .catch(error => {
        console.error('Error checking resolved chime file:', error);
      });
    
    setAudioElement(audio);
    setResolvedAudioElement(resolvedAudio);

    // Cleanup audio elements on unmount
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (resolvedAudio) {
        resolvedAudio.pause();
        resolvedAudio.currentTime = 0;
      }
    };
  }, []);

  // Enhanced sound playing with custom audio file ONLY
  const playNotificationSound = useCallback(() => {
    console.log('Attempting to play emergency notification sound...');
    
    try {
      if (audioElement) {
        console.log('Using custom bear-alert.mp3 sound');
        // Reset audio to beginning
        audioElement.currentTime = 0;
        
        // Play the custom sound
        const playPromise = audioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Emergency sound played successfully');
            })
            .catch(error => {
              console.log('Emergency audio play failed:', error);
              console.log('Trying to play again after user interaction...');
            });
        }
      } else {
        console.log('Emergency audio not loaded');
      }
    } catch (error) {
      console.log('Emergency sound playback error:', error);
    }
  }, [audioElement]);

  // NEW: Play resolved chime sound
  const playResolvedSound = useCallback(() => {
    console.log('Attempting to play resolved chime sound...');
    
    try {
      if (resolvedAudioElement) {
        console.log('Using custom resolved_chime.mp3 sound');
        // Reset audio to beginning
        resolvedAudioElement.currentTime = 0;
        
        // Play the resolved chime
        const playPromise = resolvedAudioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Resolved chime played successfully');
            })
            .catch(error => {
              console.log('Resolved chime play failed:', error);
              console.log('Trying to play again after user interaction...');
            });
        }
      } else {
        console.log('Resolved chime audio not loaded');
      }
    } catch (error) {
      console.log('Resolved chime playback error:', error);
    }
  }, [resolvedAudioElement]);

  // Removed fallback sound - only use custom bear-alert.mp3

  const showNotification = useCallback((incident) => {
    console.log('Showing notification for incident:', incident);
    
    const notification = {
      id: Date.now(),
      incident,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
    setCurrentNotification(notification);
    
    // Play custom bear-alert sound
    playNotificationSound();
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setCurrentNotification(null);
    }, 8000);
  }, [playNotificationSound]);


  const showStatusUpdateNotification = useCallback((incident) => {
    const notification = {
      id: Date.now(),
      incident,
      timestamp: new Date(),
      isStatusUpdate: true
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5
    setCurrentNotification(notification);
    
    // Play different sound based on status
    if (incident.status === 'Resolved') {
      console.log('Incident resolved - playing resolved chime');
      playResolvedSound();
    } else {
      console.log('Status update - playing emergency sound');
      playNotificationSound();
    }
    
    // Auto-hide after 6 seconds (shorter for status updates)
    setTimeout(() => {
      setCurrentNotification(null);
    }, 6000);
  }, [playNotificationSound, playResolvedSound]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new incidents
    socket.on('incidentCreated', ({ incident }) => {
      showNotification(incident);
    });

    // Listen for status updates
    socket.on('incidentStatusUpdated', ({ incident }) => {
      showStatusUpdateNotification(incident);
    });

    // NEW: Listen for deleted incidents - hide any notifications for this incident
    socket.on('incidentDeleted', ({ incidentId, incident }) => {
      console.log(`Incident ${incidentId} was deleted - hiding any notifications`);
      
      // Hide current notification if it's for the deleted incident
      if (currentNotification && currentNotification.incident._id === incidentId) {
        setCurrentNotification(null);
      }
      
      // Remove from notifications history
      setNotifications(prev => prev.filter(notif => notif.incident._id !== incidentId));
    });

    return () => {
      socket.off('incidentCreated');
      socket.off('incidentStatusUpdated');
      socket.off('incidentDeleted'); // NEW: Clean up deleted incident listener
    };
  }, [socket, showNotification, showStatusUpdateNotification, currentNotification]);

  const handleClose = () => {
    setCurrentNotification(null);
  };

  const handleNotificationClick = () => {
    // You can add navigation to the incident here
    console.log('Notification clicked:', currentNotification?.incident);
    setCurrentNotification(null);
  };



  if (!currentNotification) return null;

  const { incident } = currentNotification;
  
  // Decode HTML entities
  const decodeHTMLEntities = (text) => {
    if (!text) return text;
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  };
  
  const reporterName = incident.reportedBy 
    ? `${incident.reportedBy.firstName || 'Unknown'} ${incident.reportedBy.lastName || 'User'}`
    : incident.name || 'Anonymous User';

  return (
    <Snackbar
      open={!!currentNotification}
      autoHideDuration={8000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 8 }}
    >
      <Alert
        severity={getTypeColor(incident.type)}
        variant="filled"
        icon={getTypeIcon(incident.type)}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
        onClick={handleNotificationClick}
        sx={{ 
          cursor: 'pointer',
          minWidth: 350,
          '&:hover': {
            transform: 'scale(1.02)',
            transition: 'transform 0.2s ease-in-out'
          }
        }}
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Emergency sx={{ fontSize: 18 }} />
          {currentNotification.isStatusUpdate ? 'Incident Status Updated' : 'New Emergency Incident'}
        </AlertTitle>
        
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {decodeHTMLEntities(incident.name)}
          </Typography>
          
          {incident.description && (
            <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
              {decodeHTMLEntities(incident.description).length > 100 
                ? decodeHTMLEntities(incident.description).substring(0, 100) + '...' 
                : decodeHTMLEntities(incident.description)
              }
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              size="small" 
              label={incident.type?.charAt(0).toUpperCase() + incident.type?.slice(1)} 
              color={getTypeColor(incident.type)}
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
            />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              👤 {reporterName}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              📍 {incident.location?.latitude?.toFixed(4)}, {incident.location?.longitude?.toFixed(4)}
            </Typography>
            {currentNotification.isStatusUpdate && (
              <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 'bold' }}>
                📊 Status: {incident.status}
              </Typography>
            )}
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
}

export default NotificationSystem;
