import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import CameraCapture from '../components/CameraCapture';
import DashboardLayout from '../layouts/DashboardLayout';

export const Tasks = () => {
  const { user, isManager, isEmployee } = useAuth();
  
  // Lists
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Manager Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [clientPhone, setClientPhone] = useState('');

  // Employee Verification Modal State
  const [activeTask, setActiveTask] = useState(null); // Task currently being verified
  const [modalStep, setModalStep] = useState(1); // 1 = Show Code, 2 = Camera Proof, 3 = Notes & Submit
  const [verificationCode, setVerificationCode] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [proofType, setProofType] = useState('gallery'); // 'gallery' or 'camera'

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data.data);

      if (isManager) {
        const employeesRes = await api.get('/auth/employees');
        setEmployees(employeesRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching tasks data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Manager: Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!title || !description || !assignedTo || !deadline) {
      setFormError('Please fill in all fields.');
      return;
    }

    setSubmittingTask(true);
    try {
      const res = await api.post('/tasks', {
        title,
        description,
        assignedTo,
        priority,
        deadline,
        clientPhone
      });

      if (res.data.success) {
        setFormSuccess('Task created and assigned successfully!');
        // Reset form
        setTitle('');
        setDescription('');
        setAssignedTo('');
        setPriority('medium');
        setDeadline('');
        setClientPhone('');
        // Reload tasks
        const tasksRes = await api.get('/tasks');
        setTasks(tasksRes.data.data);
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create task.');
    } finally {
      setSubmittingTask(false);
    }
  };

  // Employee: Start Task
  const handleStartTask = async (taskId) => {
    try {
      const res = await api.put(`/tasks/${taskId}/status`, { status: 'in_progress' });
      if (res.data.success) {
        // Refresh task list
        const tasksRes = await api.get('/tasks');
        setTasks(tasksRes.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start task.');
    }
  };

  // Employee: Open complete verification workflow
  const openVerificationModal = async (task) => {
    setActiveTask(task);
    setModalStep(1);
    setVerificationCode('');
    setCapturedPhoto(null);
    setSubmissionNotes('');
    setModalError('');
    setCodeLoading(true);

    try {
      const res = await api.post(`/tasks/${task._id}/request-code`);
      if (res.data.success) {
        setVerificationCode(res.data.code);
      }
    } catch (err) {
      setModalError('Failed to generate verification code. Please close and try again.');
    } finally {
      setCodeLoading(false);
    }
  };

  const closeVerificationModal = () => {
    setActiveTask(null);
    setVerificationCode('');
    setCapturedPhoto(null);
    setSubmissionNotes('');
    setModalError('');
    setProofType('gallery');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setModalError('Please upload an image file (png, jpg, jpeg).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result);
        setModalError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Employee: Submit complete evidence
  const handleVerifySubmit = async () => {
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await api.post(`/tasks/${activeTask._id}/submit`, {
        photo: capturedPhoto || null,
        verificationCode,
        notes: submissionNotes
      });

      if (res.data.success) {
        closeVerificationModal();
        // Refresh task list
        const tasksRes = await api.get('/tasks');
        setTasks(tasksRes.data.data);
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Verification submission failed.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Employee: Save daily progress update
  const handleSaveProgress = async () => {
    setModalSubmitting(true);
    setModalError('');
    try {
      const res = await api.post(`/tasks/${activeTask._id}/progress`, {
        photo: capturedPhoto || null,
        notes: submissionNotes
      });

      if (res.data.success) {
        closeVerificationModal();
        // Refresh task list
        const tasksRes = await api.get('/tasks');
        setTasks(tasksRes.data.data);
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save daily progress.');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>📋 Task Workspace</h2>
        <p className="text-muted">
          {isManager 
            ? 'Assign workforce operations and monitor completion verifications.' 
            : 'Track your assigned work schedules and submit verification proofs.'
          }
        </p>
      </div>

      <div className="grid-dashboard">
        
        {/* Left Column: Tasks List */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Task Register</h3>
            
            {loading ? (
              <p className="text-muted">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                No tasks logged in the system.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {tasks.map((task) => (
                  <div key={task._id} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: task.status === 'completed' ? 'var(--bg-color)' : 'white'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{task.title}</h4>
                      <span className={`badge badge-${task.status.replace('_', '-')}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-md)' }}>{task.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)', fontSize: '0.825rem', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--spacing-sm)' }} className="text-muted">
                      <div>
                        <b>Priority: </b>
                        <span className={`badge badge-${task.priority}`} style={{ padding: '2px 6px', fontSize: '0.75rem' }}>
                          {task.priority}
                        </span>
                      </div>
                      <div>
                        <b>Assigned To: </b>{task.assignedTo?.name || 'Unassigned'}
                      </div>
                      <div>
                        <b>Due: </b>{new Date(task.deadline).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Progress History timeline logs */}
                    {task.progressHistory && task.progressHistory.length > 0 && (
                      <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>⏳ Saved Progress Logs ({task.progressHistory.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {task.progressHistory.map((progress, idx) => (
                            <div key={idx} style={{ borderLeft: '2px solid var(--primary-color)', paddingLeft: '6px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(progress.timestamp).toLocaleDateString()}: </span>
                              <span>{progress.notes || 'Progress update logged.'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employee Actions */}
                    {isEmployee && (
                      <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end' }}>
                        {task.status === 'pending' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleStartTask(task._id)}>
                            🚀 Start Task
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => openVerificationModal(task)}>
                            🔒 Submit Evidence & Complete
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <span>✓ Completed</span>
                            <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>
                              {task.verificationCode}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manager Form (if manager) or guidelines (if employee) */}
        <div>
          {isManager ? (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>➕ Create & Assign Task</h3>
              
              {formError && <div className="alert alert-danger">{formError}</div>}
              {formSuccess && <div className="alert alert-success">{formSuccess}</div>}

              <form onSubmit={handleCreateTask}>
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Server Room Cabling Review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-input" 
                    rows="3"
                    placeholder="Provide detailed instructions on what needs to be verified..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign To</label>
                  <select 
                    className="form-select"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select 
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Client WhatsApp Number (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. +919876543210"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 'var(--spacing-sm)' }}
                  disabled={submittingTask}
                >
                  {submittingTask ? 'Creating...' : 'Assign Task'}
                </button>
              </form>
            </div>
          ) : (
            <div className="card" style={{ backgroundColor: 'var(--bg-color)' }}>
              <h3>🔐 Verification Walkthrough</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 'var(--spacing-xs)' }}>
                VeriKarya operates under strict cryptographic and visual audit trail rules:
              </p>
              <ol style={{ paddingLeft: 'var(--spacing-md)', fontSize: '0.85rem', marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="text-muted">
                <li>Once a task is started, you can submit evidence when ready.</li>
                <li>VeriKarya will auto-generate a unique verification code (e.g. <b>VK-4829</b>) which binds to your submission.</li>
                <li>You must capture a live photo of the work site using your device's camera. <b>Gallery uploads are strictly blocked</b> to prevent pre-recorded submissions.</li>
                <li>Submit the matched photo, code, and notes for Manager verification.</li>
              </ol>
            </div>
          )}
        </div>

      </div>

      {/* Employee Multi-step Completion Modal overlay */}
      {activeTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 'var(--spacing-md)'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0 }}>Task Completion & Verification</h3>
              <button 
                onClick={closeVerificationModal} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {modalError && <div className="alert alert-danger">{modalError}</div>}

            {codeLoading ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>Generating VK-Code...</p>
            ) : (
              <div>
                <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                  Use the following code to confirm your task completion:
                </p>

                <div className="verification-code-container">
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VERIKARYA SYSTEM CODE</div>
                  <div className="verification-code-text">{verificationCode}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Notes / Comments</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Describe the task work completed (optional)..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                  <label className="form-label">Attach Proof Image (Optional)</label>
                  {capturedPhoto ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', border: '1px solid var(--border-color)', padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)' }}>
                      <img src={capturedPhoto} alt="Upload preview" style={{ maxWidth: '60px', maxHeight: '60px', objectFit: 'cover', borderRadius: 'var(--border-radius-sm)' }} />
                      <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--success-color)' }}>✓ Image attached</div>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setCapturedPhoto(null)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Remove</button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ fontSize: '0.9rem' }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    onClick={handleSaveProgress}
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? 'Saving...' : 'Save Daily Progress'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-success" 
                    onClick={handleVerifySubmit}
                    disabled={modalSubmitting}
                  >
                    {modalSubmitting ? 'Submitting...' : 'Complete Task'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Tasks;
