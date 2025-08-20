import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "./App.css";
import {
  Container,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Snackbar,
  Alert,
  Divider
} from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [singleTransaction, setSingleTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [healthStatus, setHealthStatus] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    amount: '',
    currency: 'USD',
    description: '',
    timestamp: new Date().toISOString(),
    metadata: JSON.stringify({ example: 'data' }, null, 2)
  });

  // Fetch all transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions`);
      setTransactions(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch single transaction by ID
  const fetchTransactionById = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/${id}`);
      setSingleTransaction(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data || 'Transaction not found');
      setSingleTransaction(null);
    } finally {
      setLoading(false);
    }
  };

  // Send new transaction
  const sendTransaction = async () => {
    if (!formData.id || !formData.amount || !formData.currency || !formData.description) {
      setError('ID, amount, currency, and description are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        metadata: formData.metadata ? JSON.parse(formData.metadata) : {}
      };

      const response = await axios.post(`${API_BASE_URL}/transactions/send`, payload);
      
      if (response.data.status === 'duplicate') {
        setSuccess('Transaction already exists (duplicate request)');
      } else {
        setSuccess('Transaction queued successfully');
        setFormData({
        id: '',
        amount: '',
        description: ''
      });
      }
      setError('');
      fetchTransactions(); // Refresh the list
    } catch (err) {
      setError(err.response?.data || 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup transactions
  const cleanupTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/cleanup`);
      setSuccess(response.data);
      setTransactions([]);
      setError('');
    } catch (err) {
      setError(err.response?.data || 'Failed to cleanup transactions');
    } finally {
      setLoading(false);
    }
  };

  // Check API health
  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/health`);
      setHealthStatus(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data || 'Health check failed');
      setHealthStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setError('');
    setSuccess('');
  };

  useEffect(() => {
    fetchTransactions();
    checkHealth();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography className="header" variant="h3" component="h1" gutterBottom>
          Transactions System
        </Typography>
        
        {loading && <LinearProgress />}
        
        {/* Health Status */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              System Health
            </Typography>
            {healthStatus ? (
              <Box>
                <Typography>Status: {healthStatus.status}</Typography>
                <Typography>Server Time: {healthStatus.serverTime}</Typography>
                <Typography variant="h6" sx={{ mt: 2 }}>Queue Status:</Typography>
                <Typography>Waiting: {healthStatus.queue.waiting}</Typography>
                <Typography>Active: {healthStatus.queue.active}</Typography>
                <Typography>Completed: {healthStatus.queue.completed}</Typography>
                <Typography>Failed: {healthStatus.queue.failed}</Typography>
                <Typography>Delayed: {healthStatus.queue.delayed}</Typography>
              </Box>
            ) : (
              <Typography>Loading health status...</Typography>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={checkHealth}
              sx={{ mt: 2 }}
            >
              Refresh Health
            </Button>
          </CardContent>
        </Card>

        {/* Transaction Form */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Create New Transaction
            </Typography>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Client ID"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                required
              />
              <TextField
                label="Amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
              <TextField
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                required
              />
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                multiline
                rows={2}
              />
              <TextField
                label="Timestamp"
                name="timestamp"
                value={formData.timestamp}
                onChange={handleInputChange}
                disabled
              />
              <TextField
                label="Metadata (JSON)"
                name="metadata"
                value={formData.metadata}
                onChange={handleInputChange}
                multiline
                rows={4}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={sendTransaction}
                disabled={loading}
              >
                Send Transaction
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Lookup Transaction */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Lookup Transaction
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Client ID"
                variant="outlined"
                size="small"
                onChange={(e) => setFormData(prev => ({ ...prev, lookupId: e.target.value }))}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={() => fetchTransactionById(formData.lookupId)}
                disabled={loading}
              >
                Find Transaction
              </Button>
            </Box>
            
            {singleTransaction && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Transaction Details:</Typography>
                <pre>{JSON.stringify(singleTransaction, null, 2)}</pre>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" gutterBottom>
                All Transactions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={fetchTransactions}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button 
                  variant="contained" 
                  color="error" 
                  onClick={cleanupTransactions}
                  disabled={loading}
                >
                  Cleanup All
                </Button>
              </Box>
            </Box>
            
            {transactions.length === 0 ? (
              <Typography sx={{ mt: 2 }}>No transactions found</Typography>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Client ID</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.id}</TableCell>
                        <TableCell>{tx.client_id}</TableCell>
                        <TableCell>{tx.amount}</TableCell>
                        <TableCell>{tx.currency}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>{tx.status}</TableCell>
                        <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Snackbars for notifications */}
        <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
        <Snackbar open={!!success} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

export default App;