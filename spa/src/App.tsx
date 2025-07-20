import React, { useState, useEffect } from 'react';
import './App.css';

interface Recipient {
  id: number;
  email: string;
  active: number;
}

interface AddRecipientResponse {
  message: string;
  id: number;
  cloudflare_added?: boolean;
}

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'info' | 'warning';
  autoClose?: boolean;
}

const API_BASE = '/api';

function App() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch recipients on component mount
  useEffect(() => {
    fetchRecipients();
  }, []);

  const addNotification = (
    message: string,
    type: 'success' | 'info' | 'warning',
    autoClose = true
  ) => {
    const notification: Notification = {
      id: Date.now() + Math.random(),
      message,
      type,
      autoClose,
    };

    setNotifications(prev => [...prev, notification]);

    if (autoClose) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    }
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/recipients`);

      if (!response.ok) {
        throw new Error(`Failed to fetch recipients: ${response.status}`);
      }

      const data = await response.json();
      setRecipients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recipients');
    } finally {
      setLoading(false);
    }
  };

  const addRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setAddingRecipient(true);
      setError(null);

      const response = await fetch(`${API_BASE}/recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail.trim() }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Email already exists');
        }
        throw new Error(`Failed to add recipient: ${response.status}`);
      }

      const responseData: AddRecipientResponse = await response.json();

      // Show appropriate notification based on Cloudflare API response
      if (responseData.cloudflare_added) {
        addNotification(
          `✅ ${newEmail.trim()} added successfully! Verification email sent automatically.`,
          'success'
        );
      } else {
        addNotification(
          `📧 ${newEmail.trim()} added to database. Please verify manually in Cloudflare dashboard.`,
          'warning',
          false // Don't auto-close warnings
        );
      }

      setNewEmail('');
      await fetchRecipients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipient');
    } finally {
      setAddingRecipient(false);
    }
  };

  const removeRecipient = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/recipients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to remove recipient: ${response.status}`);
      }

      addNotification(`${email} removed successfully`, 'info');
      await fetchRecipients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove recipient');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Directors Email Management</h1>
        <p>Manage recipients for directors@bardonlodge.co.uk</p>
      </header>

      <main className="main">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="notifications">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification notification-${notification.type}`}
              >
                <span className="notification-message">{notification.message}</span>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="notification-close"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error messages */}
        {error && (
          <div className="error">
            {error}
            <button onClick={() => setError(null)} className="error-close">
              ×
            </button>
          </div>
        )}

        <section className="add-section">
          <h2>Add New Recipient</h2>

          <form onSubmit={addRecipient} className="add-form">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Enter email address..."
              required
              disabled={addingRecipient}
              className="email-input"
            />
            <button type="submit" disabled={addingRecipient} className="add-button">
              {addingRecipient ? 'Adding...' : 'Add Recipient'}
            </button>
          </form>
        </section>

        <section className="list-section">
          <h2>Current Recipients</h2>
          {loading ? (
            <div className="loading">Loading recipients...</div>
          ) : recipients.length === 0 ? (
            <div className="empty">No recipients found. Add the first one above!</div>
          ) : (
            <div className="recipients-list">
              {recipients.map(recipient => (
                <div key={recipient.id} className="recipient-item">
                  <span className="recipient-email">{recipient.email}</span>
                  <span className={`recipient-status ${recipient.active ? 'active' : 'inactive'}`}>
                    {recipient.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => removeRecipient(recipient.id, recipient.email)}
                    className="remove-button"
                    title="Remove recipient"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
