import React, { useState, useEffect } from 'react';
import api from '../services/api';

export const EmployeeMaster = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  // Single employee form state
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    officeLocation: { lat: 12.9715987, lng: 77.5945627 }
  });

  // Bulk CSV file state
  const [csvFileContent, setCsvFileContent] = useState('');
  const [parsedEmployees, setParsedEmployees] = useState([]);
  const [bulkFeedback, setBulkFeedback] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/employees');
      if (res.data && res.data.success) {
        setEmployees(res.data.data);
        setSelectedEmployees([]);
      }
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch employees');
      setLoading(false);
    }
  };

  const handleEditClick = (emp) => {
    setCurrentEmployee(emp);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      password: '', // blank if not changing
      officeLocation: emp.officeLocation || { lat: 12.9715987, lng: 77.5945627 }
    });
    setShowEditModal(true);
  };

  const handleAddClick = () => {
    setCurrentEmployee(null);
    setEmpForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      officeLocation: { lat: 12.9715987, lng: 77.5945627 }
    });
    setShowEditModal(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      if (currentEmployee) {
        // Edit employee profile
        const res = await api.put(`/auth/employees/${currentEmployee._id}`, {
          name: empForm.name,
          email: empForm.email,
          phone: empForm.phone,
          officeLocation: empForm.officeLocation
        });
        if (res.data.success) {
          setSuccessMsg('Employee updated successfully');
          fetchEmployees();
          setShowEditModal(false);
        }
      } else {
        // Add single employee
        if (!empForm.password) {
          setError('Password is required for new registration');
          return;
        }
        const res = await api.post('/auth/register', {
          name: empForm.name,
          email: empForm.email,
          password: empForm.password,
          role: 'employee'
        });
        if (res.data.success) {
          // Update phone / location if provided
          if (empForm.phone) {
            await api.put(`/auth/employees/${res.data.user.id}`, {
              phone: empForm.phone,
              officeLocation: empForm.officeLocation
            });
          }
          setSuccessMsg('Employee registered successfully');
          fetchEmployees();
          setShowEditModal(false);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      setError('');
      setSuccessMsg('');
      const res = await api.delete(`/auth/employees/${id}`);
      if (res.data.success) {
        setSuccessMsg('Employee deleted successfully');
        fetchEmployees();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete employee');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = filteredEmployees.map(emp => emp._id);
      setSelectedEmployees(visibleIds);
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(item => item !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedEmployees.length} selected employees?`)) return;

    try {
      setError('');
      setSuccessMsg('');
      const res = await api.delete('/auth/employees', { data: { employeeIds: selectedEmployees } });
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Employees deleted successfully');
        fetchEmployees();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected employees');
    }
  };

  // CSV parsing logic
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvFileContent(text);
      
      // Parse CSV contents: Expect headers: name, email, password, phone
      const lines = text.split('\n');
      if (lines.length === 0) return;
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
      const list = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple comma split handling potential quotes
        const values = line.split(',').map(v => v.trim().replace(/["']/g, ''));
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        
        if (obj.name && obj.email && obj.password) {
          list.push(obj);
        }
      }
      setParsedEmployees(list);
    };
    reader.readAsText(file);
  };

  const handleBulkOnboardSubmit = async () => {
    try {
      setError('');
      setBulkFeedback(null);
      if (parsedEmployees.length === 0) {
        setError('No valid employees found in CSV');
        return;
      }

      const res = await api.post('/auth/employees/bulk', { employees: parsedEmployees });
      if (res.data.success) {
        setBulkFeedback(res.data.data);
        setSuccessMsg('Bulk onboarding completed!');
        fetchEmployees();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to run bulk onboarding');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const query = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (emp.phone && emp.phone.includes(query))
    );
  });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Employee Master Data</h1>
          <p className="text-muted">Manage active technicians and perform bulk onboarding.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button className="btn btn-outline" onClick={() => setShowBulkModal(true)} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Bulk Import (CSV)
          </button>
          <button className="btn btn-primary" onClick={handleAddClick} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Employee
          </button>
        </div>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Search by name, email, or phone number..." 
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>Loading employee master data...</div>
      ) : (
        <>
          {selectedEmployees.length > 0 && (
            <div className="card" style={{
              backgroundColor: 'var(--primary-light)',
              borderColor: 'var(--primary-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
              padding: '10px 16px',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                Selected {selectedEmployees.length} employee{selectedEmployees.length > 1 ? 's' : ''}
              </div>
              <button className="btn btn-danger" onClick={handleBulkDelete} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete Selected
              </button>
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', paddingLeft: 'var(--spacing-md)' }}>
                    <input 
                      type="checkbox" 
                      checked={filteredEmployees.length > 0 && selectedEmployees.length === filteredEmployees.length} 
                      onChange={handleSelectAll} 
                      style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Office Geofence (Lat, Lng)</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No technicians matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp._id} style={selectedEmployees.includes(emp._id) ? { backgroundColor: 'var(--primary-light)' } : {}}>
                      <td style={{ paddingLeft: 'var(--spacing-md)' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp._id)} 
                          onChange={() => handleSelectEmployee(emp._id)} 
                          style={{ cursor: 'pointer', transform: 'scale(1.1)' }} 
                        />
                      </td>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.phone || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {emp.officeLocation ? `${emp.officeLocation.lat.toFixed(5)}, ${emp.officeLocation.lng.toFixed(5)}` : '12.97160, 77.59456'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }} onClick={() => handleEditClick(emp)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            Edit
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center' }} onClick={() => handleDeleteEmployee(emp._id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit/Add Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--card-bg)', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {currentEmployee ? 'Edit Profile' : 'Register New Technician'}
            </h3>
            
            <form onSubmit={handleSaveEmployee}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="+91 XXXXXXXXXX"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                />
              </div>

              {!currentEmployee && (
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={empForm.password}
                    onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Office Lat</label>
                  <input 
                    type="number" 
                    step="0.0000001" 
                    className="form-input"
                    value={empForm.officeLocation.lat}
                    onChange={(e) => setEmpForm({ 
                      ...empForm, 
                      officeLocation: { ...empForm.officeLocation, lat: parseFloat(e.target.value) } 
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Office Lng</label>
                  <input 
                    type="number" 
                    step="0.0000001" 
                    className="form-input"
                    value={empForm.officeLocation.lng}
                    onChange={(e) => setEmpForm({ 
                      ...empForm, 
                      officeLocation: { ...empForm.officeLocation, lng: parseFloat(e.target.value) } 
                    })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--card-bg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Bulk Onboard via CSV</h3>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }} className="alert alert-info">
              CSV file must include a header line with exactly the fields: <strong>name, email, password, phone</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Select CSV File</label>
              <input 
                type="file" 
                accept=".csv" 
                className="form-input" 
                onChange={handleCsvFileChange}
              />
            </div>

            {parsedEmployees.length > 0 && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 'var(--spacing-sm)' }}>
                  Preview ({parsedEmployees.length} records ready):
                </h4>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedEmployees.map((pe, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td>{pe.name}</td>
                          <td>{pe.email}</td>
                          <td>{pe.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bulkFeedback && (
              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--success-color)' }}>Onboarding Summary:</h4>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
                  <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>Success (Registered):</span> {bulkFeedback.registered?.length || 0}<br />
                  <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>Skipped:</span> {bulkFeedback.skipped?.length || 0}<br />
                  <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>Errors:</span> {bulkFeedback.errors?.length || 0}
                </p>
                {bulkFeedback.skipped?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Skipped: {bulkFeedback.skipped.map(s => s.email).join(', ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setShowBulkModal(false);
                  setParsedEmployees([]);
                  setBulkFeedback(null);
                }}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleBulkOnboardSubmit}
                disabled={parsedEmployees.length === 0}
              >
                Onboard Employees
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeMaster;
