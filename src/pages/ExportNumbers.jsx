import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('aura_token')}`
});

export default function ExportNumbers() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  const [txtMode, setTxtMode] = useState('clean'); // 'clean' or 'jid'
  const [error, setError] = useState('');

  // 1. Fetch available WhatsApp sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/sessions`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Default select the first connected session, or the first session overall
        const connected = data.find(s => s.status === 'Connected');
        if (connected) {
          setSelectedSessionId(connected.id);
        } else if (data.length > 0) {
          setSelectedSessionId(data[0].id);
        }
      } else {
        setError('Failed to fetch WhatsApp devices.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the server.');
    } finally {
      setLoadingSessions(false);
    }
  };

  // 2. Fetch groups for selected WhatsApp session
  const fetchGroups = async (sessionId) => {
    if (!sessionId) return;
    setLoadingGroups(true);
    setError('');
    setGroups([]);
    setSelectedGroupIds([]);
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/groups?sessionId=${sessionId}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to retrieve groups for this WhatsApp account.');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading WhatsApp groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchGroups(selectedSessionId);
    }
  }, [selectedSessionId]);

  // Handle group card click (toggle selection)
  const handleToggleGroup = (groupId) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId) 
        : [...prev, groupId]
    );
  };

  // Select all / Deselect all
  const handleSelectAll = (filteredGroups) => {
    const filteredIds = filteredGroups.map(g => g.id);
    const allSelected = filteredIds.every(id => selectedGroupIds.includes(id));
    if (allSelected) {
      // Remove all filtered from selected
      setSelectedGroupIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Add all filtered to selected (without duplicates)
      setSelectedGroupIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Search filter
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.id.includes(searchQuery)
  );

  // Compute total numbers to export
  const getSelectedParticipants = () => {
    const participantsMap = {};
    selectedGroupIds.forEach(gid => {
      const group = groups.find(g => g.id === gid);
      if (group && group.participants) {
        group.participants.forEach(p => {
          participantsMap[p.id] = {
            id: p.id,
            admin: p.admin,
            groupName: group.name
          };
        });
      }
    });
    return Object.values(participantsMap);
  };

  const selectedParticipants = getSelectedParticipants();

  // Export File Generation & Download
  const handleExport = () => {
    if (selectedParticipants.length === 0) {
      if (window.notify) window.notify('warning', 'Please select at least one group to export!');
      return;
    }

    let fileContent = '';
    let mimeType = 'text/plain';
    let fileExtension = 'txt';
    const timestamp = new Date().toISOString().slice(0,10);
    let fileName = `whatsapp_contacts_${timestamp}`;

    // If exporting single group, name after it
    if (selectedGroupIds.length === 1) {
      const g = groups.find(x => x.id === selectedGroupIds[0]);
      if (g) {
        fileName = `${g.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contacts`;
      }
    }

    switch (exportFormat) {
      case 'csv':
        mimeType = 'text/csv;charset=utf-8;';
        fileExtension = 'csv';
        fileContent = '\uFEFF'; // UTF-8 BOM
        fileContent += 'Phone Number,Full JID,Role,Source Group\n';
        selectedParticipants.forEach(p => {
          const phone = p.id.split('@')[0];
          const role = p.admin ? (p.admin === 'admin' ? 'Admin' : 'Super Admin') : 'Member';
          fileContent += `"${phone}","${p.id}","${role}","${p.groupName.replace(/"/g, '""')}"\n`;
        });
        break;

      case 'xlsx': // HTML/XML Excel format
        mimeType = 'application/vnd.ms-excel';
        fileExtension = 'xls';
        fileContent = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Contacts Export</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
              th { background-color: #00832e; color: white; font-weight: bold; }
              td, th { border: 0.5pt solid #cbd5e1; padding: 4px; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <table>
              <tr>
                <th>Phone Number</th>
                <th>Full JID</th>
                <th>Role</th>
                <th>Source Group</th>
              </tr>
        `;
        selectedParticipants.forEach(p => {
          const phone = p.id.split('@')[0];
          const role = p.admin ? (p.admin === 'admin' ? 'Admin' : 'Super Admin') : 'Member';
          fileContent += `
              <tr>
                <td style="mso-number-format:'\\@';">${phone}</td>
                <td>${p.id}</td>
                <td>${role}</td>
                <td>${p.groupName}</td>
              </tr>
          `;
        });
        fileContent += `
            </table>
          </body>
          </html>
        `;
        break;

      case 'txt':
        mimeType = 'text/plain;charset=utf-8;';
        fileExtension = 'txt';
        selectedParticipants.forEach(p => {
          const phone = p.id.split('@')[0];
          fileContent += txtMode === 'clean' ? `${phone}\r\n` : `${p.id}\r\n`;
        });
        break;

      case 'json':
        mimeType = 'application/json;charset=utf-8;';
        fileExtension = 'json';
        const exportData = selectedParticipants.map(p => ({
          phoneNumber: p.id.split('@')[0],
          jid: p.id,
          role: p.admin || 'member',
          sourceGroup: p.groupName
        }));
        fileContent = JSON.stringify(exportData, null, 2);
        break;

      default:
        break;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.notify) {
      window.notify('success', `Successfully exported ${selectedParticipants.length} contacts!`);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'GP';
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const activeSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="dashboard-container">
      {/* Upper header */}
      <div className="container-top">
        <div className="container-top__left">
          <h5 className="container-top__title">Export Group Contacts</h5>
          <p className="container-top__desc">
            Load WhatsApp groups and quickly export numbers to CSV, Excel, TXT or JSON format.
          </p>
        </div>
      </div>

      <div className="dashboard-container__body">
        {/* Device selector row */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px', background: '#ffffff', padding: '20px' }}>
          <div className="row align-items-center">
            <div className="col-md-6 col-lg-4 form-group mb-md-0">
              <label className="form-label fw-bold text-muted mb-2">Select Connected WhatsApp Device</label>
              {loadingSessions ? (
                <div className="d-flex align-items-center gap-2 text-muted">
                  <span className="spinner-border spinner-border-sm text-success" />
                  <span>Loading devices...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-danger small">No WhatsApp devices configured. Please connect a device first.</div>
              ) : (
                <select
                  className="form--control"
                  style={{ borderRadius: '8px' }}
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  <option value="" disabled>Choose an active device</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.session_name || 'WhatsApp Session'} ({s.phone || 'No phone'}) - {s.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="col-md-6 col-lg-8 mt-2 mt-md-0 d-flex justify-content-md-end">
              {activeSession && (
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge rounded-pill ${activeSession.status === 'Connected' ? 'bg-success' : 'bg-secondary'}`} style={{ padding: '6px 12px' }}>
                    {activeSession.status === 'Connected' ? '● Connected' : 'Disconnected'}
                  </span>
                  {activeSession.status !== 'Connected' && (
                    <span className="small text-muted">Please ensure this device is connected under WhatsApp Devices.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert" style={{ borderRadius: '8px' }}>
            <i className="las la-exclamation-circle fs-5" />
            <div>{error}</div>
          </div>
        )}

        {/* Export Configuration and Group Grid Grid */}
        <div className="row gy-4">
          {/* Left panel: Group selection grid */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
              <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                  <h6 className="mb-0 fw-bold fs-6 text-dark">WhatsApp Groups</h6>
                  
                  {groups.length > 0 && (
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleSelectAll(filteredGroups)}
                      style={{ borderRadius: '6px' }}
                    >
                      {filteredGroups.every(g => selectedGroupIds.includes(g.id)) ? 'Deselect All' : 'Select All Filtered'}
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="mt-3">
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form--control"
                      placeholder="Search group by name..."
                      style={{ paddingLeft: '40px', borderRadius: '8px' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={loadingGroups || groups.length === 0}
                    />
                    <i className="las la-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5" />
                  </div>
                </div>
              </div>

              <div className="card-body p-4">
                {loadingGroups ? (
                  <div className="d-flex flex-column align-items-center justify-content-center py-5">
                    <div className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }} />
                    <p className="text-muted">Fetching WhatsApp groups and profile pictures...</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-5">
                    <img
                      src="https://wpp.raybeamdigital.com/assets/images/no-data.gif"
                      style={{ width: '120px', opacity: 0.7 }}
                      alt="No groups"
                    />
                    <h6 className="mt-3 fw-semibold">No groups found</h6>
                    <p className="text-muted small px-3">
                      {selectedSessionId 
                        ? 'We couldn\'t find any groups associated with this device, or it is still loading.'
                        : 'Connect or select an active WhatsApp device above to scan for participating groups.'}
                    </p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="text-muted">No groups matching "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {filteredGroups.map((g) => {
                      const isSelected = selectedGroupIds.includes(g.id);
                      return (
                        <div className="col-md-6" key={g.id}>
                          <div
                            onClick={() => handleToggleGroup(g.id)}
                            style={{
                              border: isSelected ? '1px solid #00832e' : '1px solid #e2e8f0',
                              background: isSelected ? '#f0fdf4' : '#ffffff',
                              borderRadius: '10px',
                              padding: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 4px 12px rgba(0, 131, 46, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                            onMouseOver={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = '#00832e';
                            }}
                            onMouseOut={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            {/* Checkbox badge */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                border: isSelected ? 'none' : '2px solid #cbd5e1',
                                background: isSelected ? '#00832e' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {isSelected && <i className="las la-check text-white" style={{ fontSize: '12px' }} />}
                            </div>

                            {/* Group Avatar */}
                            <div style={{ flexShrink: 0 }}>
                              {g.avatar ? (
                                <img
                                  src={g.avatar}
                                  alt={g.name}
                                  style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid #fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: isSelected ? '#00832e' : '#e2e8f0',
                                  color: isSelected ? '#ffffff' : '#475569',
                                  display: g.avatar ? 'none' : 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '15px'
                                }}
                              >
                                {getInitials(g.name)}
                              </div>
                            </div>

                            {/* Group Info */}
                            <div style={{ overflow: 'hidden', paddingRight: '20px' }}>
                              <h6
                                className="mb-1 text-truncate fw-bold fs-6 text-dark"
                                style={{ fontSize: '14.5px' }}
                              >
                                {g.name}
                              </h6>
                              <span className="text-muted small d-block">
                                <i className="las la-users me-1" />
                                {g.participants ? g.participants.length : 0} members
                              </span>
                              <span
                                className="text-muted d-block text-truncate mt-1"
                                style={{ fontSize: '10px', opacity: 0.7 }}
                              >
                                {g.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Export Panel */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ borderRadius: '12px', background: '#ffffff', top: '100px' }}>
              <div className="card-header bg-transparent border-0 pt-4 px-4 pb-0">
                <h6 className="mb-0 fw-bold fs-6 text-dark">Export Options</h6>
              </div>
              <div className="card-body p-4">
                {/* Selection Statistics */}
                <div
                  className="mb-4 text-center p-3"
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9'
                  }}
                >
                  <div className="small text-muted uppercase fw-bold mb-1" style={{ letterSpacing: '0.05em', fontSize: '10px' }}>
                    Selected Summary
                  </div>
                  <div className="d-flex justify-content-around mt-2">
                    <div>
                      <div className="fs-3 fw-bold text-dark">{selectedGroupIds.length}</div>
                      <div className="small text-muted">Groups</div>
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#e2e8f0' }} />
                    <div>
                      <div className="fs-3 fw-bold text-success">{selectedParticipants.length}</div>
                      <div className="small text-muted">Unique Contacts</div>
                    </div>
                  </div>
                </div>

                {/* Format selection */}
                <div className="form-group mb-3">
                  <label className="form-label fw-semibold text-muted mb-2">Export File Format</label>
                  <select
                    className="form--control"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="csv">CSV Spreadsheet (*.csv)</option>
                    <option value="xlsx">Excel Document (*.xls)</option>
                    <option value="txt">Plain Text File (*.txt)</option>
                    <option value="json">JSON Structured (*.json)</option>
                  </select>
                </div>

                {/* Additional controls based on format */}
                {exportFormat === 'txt' && (
                  <div
                    className="p-3 mb-3"
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    <label className="form-label fw-semibold text-muted mb-2">Text Formatting</label>
                    <div className="d-flex flex-column gap-2">
                      <label className="d-flex align-items-center gap-2 small cursor-pointer">
                        <input
                          type="radio"
                          name="txtMode"
                          checked={txtMode === 'clean'}
                          onChange={() => setTxtMode('clean')}
                          className="form-check-input"
                        />
                        <span>Clean Numbers only (e.g. 94769631098)</span>
                      </label>
                      <label className="d-flex align-items-center gap-2 small cursor-pointer">
                        <input
                          type="radio"
                          name="txtMode"
                          checked={txtMode === 'jid'}
                          onChange={() => setTxtMode('jid')}
                          className="form-check-input"
                        />
                        <span>Full WhatsApp JID (e.g. 94769631098@s.whatsapp.net)</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Export CTA Button */}
                <button
                  className="btn btn--base w-100 py-3 mt-2"
                  onClick={handleExport}
                  disabled={selectedParticipants.length === 0}
                  style={{
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    boxShadow: selectedParticipants.length > 0 ? '0 4px 12px rgba(0, 131, 46, 0.2)' : 'none',
                    opacity: selectedParticipants.length === 0 ? 0.6 : 1,
                    cursor: selectedParticipants.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <i className="las la-download me-2" style={{ fontSize: '18px' }} />
                  Export Contacts
                </button>

                <div className="mt-3 text-center">
                  <small className="text-muted small" style={{ fontSize: '11px' }}>
                    Duplicated numbers across groups are automatically filtered out when exporting.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
