import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

export default function AdminDashboard({ companyName = "AMAGix Technologies", onLogout }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Floating Toast Notification State
  const [toast, setToast] = useState(null); // { id: number, message: string, type: 'success' | 'error' }

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const token = sessionStorage.getItem('adminToken');

  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  };

  // Auto-dismiss Toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchStudents = async () => {
    try {
      const res = await fetch('https://amagix-registration.onrender.com/api/admin/students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Unauthorized or failed to fetch data');
      const data = await res.json();
      setStudents(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleApproveAndCopy = async (student) => {
    setActionLoading(student.id);
    try {
      const res = await fetch(`https://amagix-registration.onrender.com/api/admin/approve/${student.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      // Construct the professional, well-arranged copy-paste message
      const formattedMessage = 
`Subject: Official Admission Approval & Next Steps - Tech Camp at AMAGix Technologies

🎉 Congratulations, ${student.full_name}!

We are delighted to inform you that your application for the ${student.track} track at Tech Camp at AMAGix Technologies has been reviewed and officially approved!

Tuition & Enrollment Details:
• Bank Name: Moniepoint
• Account Name: AMAGix Technologies
• Account Number: 5409197862

Next Steps:
To secure your slot, please transfer the required fee to the account above. Once done, kindly share your payment receipt via WhatsApp to 08139081076 for immediate validation and confirmation.

Warm regards,
AMAGix Admissions Team`;

      // Copy message to clipboard automatically
      await navigator.clipboard.writeText(formattedMessage);

      showToast(`Approved ${student.full_name}! Message copied to clipboard.`, 'success');
      fetchStudents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Real-time Filtering Logic
  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.includes(searchTerm) ||
      student.state.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrack = selectedTrack === 'ALL' || student.track === selectedTrack;
    const matchesStatus = selectedStatus === 'ALL' || student.status === selectedStatus;

    return matchesSearch && matchesTrack && matchesStatus;
  });

  // Derived applicant metrics from real data
  const totalApplicants = students.length;
  const pendingCount = students.filter((s) => s.status === 'PENDING').length;
  const approvedCount = students.filter((s) => s.status === 'APPROVED').length;
  const showingCount = filteredStudents.length;
  const hasActiveFilters = searchTerm !== '' || selectedTrack !== 'ALL' || selectedStatus !== 'ALL';

  return (
    <div className="admin-container">
      {/* Modern Floating Toast Notification System */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`} role="alert" aria-live="assertive">
          <div className="toast-icon">
            {toast.type === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <div className="toast-content">
            <span className="toast-title">{toast.type === 'success' ? 'Success & Copied' : 'Action Failed'}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <button 
            className="toast-close-btn" 
            onClick={() => setToast(null)}
            title="Dismiss notification"
            aria-label="Dismiss"
          >
            &times;
          </button>
          <div className="toast-progress-bar"></div>
        </div>
      )}

      {/* Top Ambient Glow Effects */}
      <div className="portal-ambient-sphere admin-ambient-top"></div>

      {/* Main Command Header */}
      <header className="admin-header">
        <div className="admin-header-branding">
          <div className="admin-logo-wrapper">
            <img 
              src="/amagix.png" 
              alt={`${companyName} Logo`} 
              className="admin-company-logo" 
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="admin-title-row">
              <h2>{companyName}</h2>
              <span className="admin-badge-live">
                <span className="live-dot"></span>
                <span>Command Center</span>
              </span>
            </div>
            <p className="admin-subtitle">Admissions Management &amp; Student Onboarding System</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <button 
            onClick={() => { setLoading(true); fetchStudents(); }} 
            className="action-btn-secondary refresh-btn"
            title="Refresh applicant data"
            disabled={loading}
          >
            <svg 
              className={`btn-icon ${loading ? 'spinning' : ''}`} 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button 
            onClick={onLogout} 
            className="action-btn-danger logout-btn"
            title="Sign out of admin portal"
          >
            <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Real-time Applicant Statistics Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Applicants</span>
            <span className="stat-value">{totalApplicants}</span>
            <span className="stat-subtext">All submitted candidates</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Review</span>
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-subtext">Awaiting decision</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-emerald">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Approved Students</span>
            <span className="stat-value">{approvedCount}</span>
            <span className="stat-subtext">Admitted &amp; notified</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper stat-icon-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Matching Results</span>
            <span className="stat-value">{showingCount}</span>
            <span className="stat-subtext">
              {hasActiveFilters ? 'Active filters applied' : 'All records in view'}
            </span>
          </div>
        </div>
      </section>

      {/* Search & Filter Controls Bar */}
      <div className="filter-controls-card">
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            placeholder="Search by name, email, phone, or state..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="search-clear-inline" 
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="select-wrapper">
            <svg className="select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
            <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)}>
              <option value="ALL">All Career Tracks</option>
              <option value="Basic Computing">Basic Computing</option>
              <option value="Web Development">Web Development</option>
              <option value="App Development">App Development</option>
              <option value="Server Security & Ethical Hacking">Server Security & Ethical Hacking</option>
            </select>
          </div>

          <div className="select-wrapper">
            <svg className="select-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved Only</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setSelectedTrack('ALL');
                setSelectedStatus('ALL');
              }}
              title="Reset all search and filter criteria"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="admin-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
          <button onClick={fetchStudents} className="error-retry-btn">Try Again</button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading-card">
          <div className="admin-spinner"></div>
          <p>Syncing admissions records from database...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Applicant</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>State</th>
                <th>Track</th>
                <th>Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-table-cell">
                    <div className="empty-state-content">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <h4>No applicants found</h4>
                      <p>No student records match the active search query or filter selection.</p>
                      {hasActiveFilters && (
                        <button 
                          className="reset-search-btn"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedTrack('ALL');
                            setSelectedStatus('ALL');
                          }}
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="cell-id">
                      <span className="id-badge">#{student.id}</span>
                    </td>
                    <td className="cell-name">
                      <div className="applicant-name-wrapper">
                        <span className="applicant-avatar">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'S'}
                        </span>
                        <strong className="applicant-name">{student.full_name}</strong>
                      </div>
                    </td>
                    <td className="cell-email">{student.email}</td>
                    <td className="cell-phone">{student.phone}</td>
                    <td className="cell-gender">
                      <span className="gender-badge">{student.gender}</span>
                    </td>
                    <td className="cell-state">{student.state}</td>
                    <td className="cell-track">
                      <span className="track-badge">{student.track}</span>
                    </td>
                    <td className="cell-level">
                      <span className="level-badge">{student.experience_level}</span>
                    </td>
                    <td className="cell-status">
                      <span className={`status-pill ${student.status.toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {student.status}
                      </span>
                    </td>
                    <td className="cell-action">
                      {student.status === 'PENDING' ? (
                        <button
                          onClick={() => handleApproveAndCopy(student)}
                          disabled={actionLoading === student.id}
                          className="approve-btn"
                          title={`Approve ${student.full_name} and copy executive approval message`}
                        >
                          {actionLoading === student.id ? (
                            <span className="btn-loading-inline">
                              <span className="mini-spinner"></span>
                              <span>Processing...</span>
                            </span>
                          ) : (
                            <span className="btn-content-inline">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              <span>Approve &amp; Copy Message</span>
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="approved-label">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          <span>Approved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}