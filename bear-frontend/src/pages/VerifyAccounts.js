import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Divider,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Refresh,
  Person,
  Email,
  Phone,
  Work,
  ArrowBack
} from '@mui/icons-material';
import { 
  getVerificationStatusColor, 
  getVerificationStatusText
} from '../utils/verificationUtils';
// Using fetch instead of axios to avoid webpack polyfill issues

function VerifyAccounts() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const token = localStorage.getItem('token');

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/verification/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending verifications');
      }
      
      const data = await response.json();
      console.log('Fetched pending users:', data);
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setMessage({ type: 'error', text: 'Failed to fetch pending verifications' });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const fetchUserDetails = async (userId) => {
    try {
      setDetailsLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/verification/${userId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const data = await response.json();
      console.log('User details:', data);
      setUserDetails(data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setMessage({ type: 'error', text: 'Failed to fetch user details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
    fetchUserDetails(user._id);
  };

  const handleVerifyUser = (status) => {
    setVerifyDialogOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/verification/${selectedUser._id}/verify`,
        {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'Verified'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify user');
      }

      const result = await response.json();
      console.log('Verification response:', result);

      setMessage({ type: 'success', text: 'User verified successfully!' });
      setVerifyDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedUser(null);
      
      // Force refresh the pending users list immediately and after delay
      fetchPendingUsers();
      setTimeout(() => {
        fetchPendingUsers();
      }, 1000);
    } catch (error) {
      console.error('Error verifying user:', error);
      setMessage({ type: 'error', text: 'Failed to verify user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason' });
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/verification/${selectedUser._id}/verify`,
        {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'Rejected',
            rejectionReason: rejectionReason
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject user');
      }

      const result = await response.json();
      console.log('Rejection response:', result);

      setMessage({ type: 'success', text: 'User rejected successfully!' });
      setVerifyDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedUser(null);
      setRejectionReason('');
      
      // Force refresh the pending users list immediately and after delay
      fetchPendingUsers();
      setTimeout(() => {
        fetchPendingUsers();
      }, 1000);
    } catch (error) {
      console.error('Error rejecting user:', error);
      setMessage({ type: 'error', text: 'Failed to reject user' });
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Resident': return 'primary';
      case 'Responder': return 'secondary';
      case 'Admin': return 'error';
      default: return 'default';
    }
  };

  const getResponderTypeColor = (type) => {
    switch (type) {
      case 'police': return 'info';
      case 'fire': return 'error';
      case 'hospital': return 'success';
      case 'barangay': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <AppBar position="static" sx={{ backgroundColor: "var(--bear-dark-red)", borderRadius: 0 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate("/dashboard")}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🔍 Account Verification
          </Typography>
          <IconButton color="inherit" onClick={fetchPendingUsers}>
            <Refresh />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 3, flex: 1, overflow: "auto", backgroundColor: "var(--bear-body)" }}>

      {message.text && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }}
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper 
            className="bear-card"
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              boxShadow: 2,
              backgroundColor: "var(--bear-white)",
              border: "1px solid var(--bear-yellow)"
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: "var(--bear-blue)" }}>
                Pending Verifications
              </Typography>
              <Chip 
                label={pendingUsers.length} 
                color="warning" 
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            
            {pendingUsers.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No pending verifications
                </Typography>
              </Box>
            ) : (
              <List>
                {pendingUsers.map((user, index) => (
                  <React.Fragment key={user._id}>
                    <ListItem sx={{ 
                      border: '1px solid var(--bear-yellow)', 
                      borderRadius: 2, 
                      mb: 2,
                      backgroundColor: "var(--bear-semiwhite)",
                      '&:hover': {
                        backgroundColor: "var(--bear-white)",
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Chip 
                              label={user.role} 
                              size="small" 
                              color={getRoleColor(user.role)}
                              sx={{ fontWeight: 'bold' }}
                            />
                            {user.responderType && (
                              <Chip 
                                label={user.responderType} 
                                size="small" 
                                color={getResponderTypeColor(user.responderType)}
                                variant="outlined"
                                sx={{ fontWeight: 'bold' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Email fontSize="small" color="primary" />
                              <Typography variant="body2">{user.email}</Typography>
                            </Box>
                            {user.contact && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Phone fontSize="small" color="primary" />
                                <Typography variant="body2">{user.contact}</Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                📄 Documents: {user.verificationDocuments?.length || 0} uploaded
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                📅 Submitted: {new Date(user.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="contained"
                          startIcon={<Visibility />}
                          onClick={() => handleViewUser(user)}
                          size="small"
                          sx={{ 
                            borderRadius: 2,
                            backgroundColor: "var(--bear-blue)",
                            '&:hover': {
                              backgroundColor: "var(--bear-blue)",
                              opacity: 0.8
                            }
                          }}
                        >
                          Review
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2, height: 'fit-content' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              📊 Quick Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 1
              }}>
                <Typography sx={{ fontWeight: 'bold' }}>Total Pending:</Typography>
                <Chip 
                  label={pendingUsers.length} 
                  color="warning" 
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#e3f2fd',
                borderRadius: 1
              }}>
                <Typography sx={{ fontWeight: 'bold' }}>Residents:</Typography>
                <Chip 
                  label={pendingUsers.filter(u => u.role === 'Resident').length} 
                  color="primary" 
                  variant="outlined"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#e8f5e8',
                borderRadius: 1
              }}>
                <Typography sx={{ fontWeight: 'bold' }}>Responders:</Typography>
                <Chip 
                  label={pendingUsers.filter(u => u.role === 'Responder').length} 
                  color="success" 
                  variant="outlined"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* View User Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person />
            <Typography variant="h6">
              {selectedUser?.firstName} {selectedUser?.lastName}
            </Typography>
            <Chip 
              label={selectedUser?.role} 
              size="small" 
              color={getRoleColor(selectedUser?.role)}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : userDetails ? (
            <Box>
              {/* User Information */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                User Information
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Email fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Email:</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ ml: 3 }}>{userDetails.user.email}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Phone fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Contact:</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ ml: 3 }}>{userDetails.user.contact || 'Not provided'}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Work fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Role:</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ ml: 3 }}>{userDetails.user.role}</Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Responder Type:</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ ml: 3 }}>
                    {userDetails.user.responderType || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Registration Date:</Typography>
                  <Typography variant="body2" sx={{ ml: 3 }}>
                    {new Date(userDetails.user.createdAt).toLocaleDateString()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Current Status:</Typography>
                  <Chip 
                    label={getVerificationStatusText(userDetails.user.verificationStatus)} 
                    color={getVerificationStatusColor(userDetails.user.verificationStatus)}
                    size="small"
                    sx={{ ml: 3 }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Verification Documents */}
              <Typography variant="h6" gutterBottom>
                Verification Documents ({userDetails.documents?.length || 0})
              </Typography>
              
              {userDetails.documents?.length > 0 ? (
                <List>
                  {userDetails.documents.map((doc, index) => (
                    <ListItem key={`${doc.filename}-${index}`} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {doc.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              File: {doc.filename}
                            </Typography>
                          </Box>
                        }
                        secondary={`Uploaded: ${new Date(doc.uploadedAt).toLocaleString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => window.open(doc.url, '_blank')}
                          sx={{ mr: 1 }}
                        >
                          View Document
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No documents uploaded
                </Typography>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">Loading user details...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={() => {
              setViewDialogOpen(false);
              handleVerifyUser('Verified');
            }}
            sx={{
              backgroundColor: "var(--bear-status-approved)",
              '&:hover': {
                backgroundColor: "var(--bear-status-approved)",
                opacity: 0.8
              }
            }}
          >
            Approve
          </Button>
          <Button
            variant="contained"
            startIcon={<Cancel />}
            onClick={() => {
              setViewDialogOpen(false);
              handleVerifyUser('Rejected');
            }}
            sx={{
              backgroundColor: "var(--bear-red)",
              '&:hover': {
                backgroundColor: "var(--bear-red)",
                opacity: 0.8
              }
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification Action Dialog */}
      <Dialog 
        open={verifyDialogOpen} 
        onClose={() => setVerifyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser && `Verify ${selectedUser.firstName} ${selectedUser.lastName}`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to verify this user?
          </Typography>
          
          <TextField
            fullWidth
            label="Rejection Reason (if rejecting)"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Leave empty if approving..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setVerifyDialogOpen(false);
              setRejectionReason('');
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Cancel />}
            onClick={handleRejectUser}
            disabled={actionLoading}
            sx={{
              backgroundColor: "var(--bear-red)",
              '&:hover': {
                backgroundColor: "var(--bear-red)",
                opacity: 0.8
              }
            }}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Reject'}
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircle />}
            onClick={handleConfirmVerification}
            disabled={actionLoading}
            sx={{
              backgroundColor: "var(--bear-status-approved)",
              '&:hover': {
                backgroundColor: "var(--bear-status-approved)",
                opacity: 0.8
              }
            }}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </Box>
  );
}

export default VerifyAccounts;
