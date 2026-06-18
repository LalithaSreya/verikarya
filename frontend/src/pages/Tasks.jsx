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
  const [requireCode, setRequireCode] = useState(true);

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

  // Selection & Selection Actions State
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single'); // 'single' | 'bulk'
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useEffect(() => {
    setLastSelectedIndex(null);
  }, [currentPage]);

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
        clientPhone,
        requireCode
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
        setRequireCode(true);
        // Reload tasks
        fetchData();
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
        fetchData();
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

    const isCodeRequired = task.requireCode !== false;

    if (isCodeRequired) {
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
    } else {
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

  const handleCloseAttempt = () => {
    const hasProgress = capturedPhoto || submissionNotes || (activeTask?.requireCode !== false && verificationCode);
    if (hasProgress) {
      setShowDiscardConfirm(true);
    } else {
      closeVerificationModal();
    }
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
        verificationCode: activeTask.requireCode !== false ? verificationCode : null,
        notes: submissionNotes
      });

      if (res.data.success) {
        closeVerificationModal();
        fetchData();
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
        fetchData();
      }
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save daily progress.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Selection Logic
  const handleClearSelection = () => {
    setSelectedTasks([]);
    setIsGlobalSelected(false);
    setLastSelectedIndex(null);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageTaskIds = paginatedTasks.map(t => t._id);
      setSelectedTasks(Array.from(new Set([...selectedTasks, ...pageTaskIds])));
    } else {
      const pageTaskIds = paginatedTasks.map(t => t._id);
      setSelectedTasks(selectedTasks.filter(id => !pageTaskIds.includes(id)));
      setIsGlobalSelected(false);
    }
  };

  const handleSelectTask = (e, id, index) => {
    const isChecked = e.target.checked;
    if (e.nativeEvent.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const rangeIds = paginatedTasks.slice(start, end + 1).map(t => t._id);
      if (isChecked) {
        setSelectedTasks(prev => Array.from(new Set([...prev, ...rangeIds])));
      } else {
        setSelectedTasks(prev => prev.filter(item => !rangeIds.includes(item)));
        setIsGlobalSelected(false);
      }
    } else {
      if (isChecked) {
        setSelectedTasks(prev => [...prev, id]);
      } else {
        setSelectedTasks(prev => prev.filter(item => item !== id));
        setIsGlobalSelected(false);
      }
    }
    setLastSelectedIndex(index);
  };

  // Delete Handlers
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteMode('single');
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteClick = () => {
    setDeleteMode('bulk');
    setShowDeleteConfirm(true);
  };

  const executeSingleDelete = async (id) => {
    try {
      const res = await api.delete(`/tasks/${id}`);
      if (res.data.success) {
        handleClearSelection();
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task.');
    }
  };

  const executeBulkDelete = async () => {
    try {
      const res = await api.delete('/tasks', { data: { taskIds: selectedTasks } });
      if (res.data.success) {
        handleClearSelection();
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete selected tasks.');
    }
  };

  // Search filter matching
  const filteredTasks = tasks.filter(task => {
    const query = searchTerm.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(query);
    const descMatch = task.description.toLowerCase().includes(query);
    const employeeMatch = task.assignedTo?.name?.toLowerCase().includes(query);
    const statusMatch = task.status.toLowerCase().includes(query);
    return titleMatch || descMatch || employeeMatch || statusMatch;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedTasks = itemsPerPage === -1
    ? filteredTasks
    : filteredTasks.slice(indexOfFirstItem, indexOfLastItem);

  const allPageSelected = paginatedTasks.length > 0 && paginatedTasks.every(t => selectedTasks.includes(t._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Task Workspace</h2>
        <p className="text-muted">
          {isManager 
            ? 'Assign workforce operations and monitor completion verifications.' 
            : 'Track your assigned work schedules and submit verification proofs.'
          }
        </p>
      </div>

      {(isManager || isEmployee) && selectedTasks.length > 0 && (
        <div className="card" style={{
          backgroundColor: 'var(--primary-light)',
          borderColor: 'var(--primary-color)',
          marginBottom: 'var(--spacing-md)',
          padding: '12px 16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Selected <strong style={{ color: 'var(--primary-color)' }}>{selectedTasks.length}</strong> task{selectedTasks.length > 1 ? 's' : ''}.
              {allPageSelected && filteredTasks.length > paginatedTasks.length && !isGlobalSelected && (
                <span style={{ marginLeft: '12px' }}>
                  All {paginatedTasks.length} records on this page are selected.{' '}
                  <button 
                    onClick={() => {
                      setSelectedTasks(filteredTasks.map(t => t._id));
                      setIsGlobalSelected(true);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Select all {filteredTasks.length} records matching search
                  </button>
                </span>
              )}
              {isGlobalSelected && (
                <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  All {filteredTasks.length} matching records are selected.{' '}
                  <button 
                    onClick={handleClearSelection}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary-color)',
                      textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', padding: 0
                    }}
                  >
                    Clear selection
                  </button>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button className="btn btn-outline" onClick={handleClearSelection} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Clear Selection
              </button>
              <button className="btn btn-danger" onClick={handleBulkDeleteClick} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid-dashboard">
        
        {/* Left Column: Tasks List */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <h3 style={{ margin: 0 }}>Task Register</h3>
              {(isManager || isEmployee) && paginatedTasks.length > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  Select Page Tasks
                </label>
              )}
            </div>

            <div style={{ position: 'relative', marginBottom: 'var(--spacing-md)' }}>
              <input 
                type="text" 
                placeholder="Search tasks by title, description, or employee name..." 
                className="form-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  handleClearSelection();
                }}
                style={{ paddingRight: searchTerm ? '32px' : '12px' }}
              />
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                    handleClearSelection();
                  }}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: '1.2rem', padding: '4px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
            
            {loading ? (
              <p className="text-muted">Loading tasks...</p>
            ) : paginatedTasks.length === 0 ? (
              <p className="text-muted" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                No tasks match search criteria.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {paginatedTasks.map((task, index) => (
                  <div key={task._id} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: selectedTasks.includes(task._id) ? 'var(--primary-light)' : (task.status === 'completed' ? 'var(--bg-color)' : 'white'),
                    transition: 'background-color 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                      {(isManager || isEmployee) && (
                        <input 
                          type="checkbox" 
                          checked={selectedTasks.includes(task._id)}
                          onChange={(e) => handleSelectTask(e, task._id, index)}
                          style={{ cursor: 'pointer', marginTop: '6px', transform: 'scale(1.1)' }}
                        />
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{task.title}</h4>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={`badge badge-${task.status.replace('_', '-')}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                            {(isManager || isEmployee) && (
                              <button 
                                className="btn btn-outline btn-sm" 
                                style={{ padding: '4px', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => handleDeleteClick(task)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            )}
                          </div>
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
                            <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>Saved Progress Logs ({task.progressHistory.length})</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {task.progressHistory.map((progress, idx) => (
                                <div key={idx} style={{ 
                                  borderLeft: '2px solid var(--primary-color)', 
                                  paddingLeft: '6px', 
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start'
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{new Date(progress.timestamp).toLocaleDateString()}: </span>
                                    <span>{progress.notes || 'Progress update logged.'}</span>
                                  </div>
                                  {progress.photoPath && (
                                    <img 
                                      src={progress.photoPath} 
                                      alt="Progress log" 
                                      style={{ 
                                        width: '70px', 
                                        height: '50px', 
                                        objectFit: 'cover', 
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer' 
                                      }}
                                      onClick={() => window.open(progress.photoPath, '_blank')}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Completed Evidence block */}
                        {task.status === 'completed' && task.evidence && (
                          <div style={{ 
                            marginTop: 'var(--spacing-md)', 
                            padding: 'var(--spacing-sm)', 
                            backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                            border: '1px solid rgba(16, 185, 129, 0.2)', 
                            borderRadius: 'var(--border-radius-sm)', 
                            fontSize: '0.85rem' 
                          }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--success-color)', marginBottom: 'var(--spacing-xs)', fontSize: '0.8rem' }}>
                              ✓ Final Completion Evidence
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                {task.evidence.notes && <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem' }}><b>Notes:</b> {task.evidence.notes}</p>}
                                {task.verificationCode && (
                                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                    <b>Code:</b> <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>{task.verificationCode}</span>
                                  </p>
                                )}
                              </div>
                              {task.evidence.photoPath && (
                                <img 
                                  src={task.evidence.photoPath} 
                                  alt="Final submission" 
                                  style={{ 
                                    width: '90px', 
                                    height: '65px', 
                                    objectFit: 'cover', 
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer' 
                                  }}
                                  onClick={() => window.open(task.evidence.photoPath, '_blank')}
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Employee Actions */}
                        {isEmployee && (
                          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'flex-end' }}>
                            {task.status === 'pending' && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleStartTask(task._id)}>
                                Start Task
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => openVerificationModal(task)}>
                                Submit Evidence & Complete
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--success-color)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <span>✓ Completed</span>
                                {task.verificationCode && (
                                  <span style={{ fontFamily: 'monospace', padding: '2px 6px', backgroundColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', fontWeight: 700 }}>
                                    {task.verificationCode}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {filteredTasks.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)',
                borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 'var(--spacing-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                      handleClearSelection();
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10 tasks</option>
                    <option value={25}>25 tasks</option>
                    <option value={50}>50 tasks</option>
                    <option value={-1}>All tasks</option>
                  </select>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTasks.length)} of {filteredTasks.length}
                  </span>
                </div>

                {itemsPerPage !== -1 && totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', minWidth: 'auto' }}
                    >
                      ◀
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx + 1}
                        className={currentPage === idx + 1 ? "btn btn-primary" : "btn btn-outline"}
                        onClick={() => setCurrentPage(idx + 1)}
                        style={{
                          padding: '6px 12px', minWidth: '36px', height: '34px', justifyContent: 'center',
                          backgroundColor: currentPage === idx + 1 ? 'var(--primary-color)' : 'transparent',
                          color: currentPage === idx + 1 ? '#fff' : 'var(--text-main)',
                          borderColor: currentPage === idx + 1 ? 'var(--primary-color)' : 'var(--border-color)'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      className="btn btn-outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', minWidth: 'auto' }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Manager Form (if manager) or guidelines (if employee) */}
        <div>
          {isManager ? (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Create & Assign Task</h3>
              
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

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                  <input 
                    type="checkbox" 
                    id="requireCode" 
                    checked={requireCode}
                    onChange={(e) => setRequireCode(e.target.checked)}
                    style={{ width: 'auto', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="requireCode" style={{ margin: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', userSelect: 'none' }}>
                    Require Verification Code (VK-Code)
                  </label>
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
              <h3>Verification Walkthrough</h3>
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
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 'var(--spacing-md)'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--spacing-xs)' }}>
              <h3 style={{ margin: 0 }}>Task Completion & Verification</h3>
              <button 
                onClick={handleCloseAttempt} 
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
                {activeTask.requireCode !== false && (
                  <>
                    <p className="text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                      Use the following code to confirm your task completion:
                    </p>

                    <div className="verification-code-container" style={{ marginBottom: 'var(--spacing-md)' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VERIKARYA SYSTEM CODE</div>
                      <div className="verification-code-text">{verificationCode}</div>
                    </div>
                  </>
                )}

                {/* Previous Progress Updates Timeline */}
                {activeTask.progressHistory && activeTask.progressHistory.length > 0 && (
                  <div style={{ 
                    marginBottom: 'var(--spacing-md)', maxHeight: '180px', overflowY: 'auto', 
                    padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-color)', 
                    borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      ⏳ Previous Days' Submissions ({activeTask.progressHistory.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeTask.progressHistory.map((progress, idx) => (
                        <div key={idx} style={{ 
                          borderLeft: '2px solid var(--primary-color)', paddingLeft: '8px', 
                          display: 'flex', gap: '10px', alignItems: 'flex-start'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '2px' }}>
                              <span>Update #{idx + 1}</span>
                              <span>{new Date(progress.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ color: 'var(--text-main)', fontSize: '0.8rem' }}>{progress.notes || 'Progress update logged.'}</div>
                          </div>
                          {progress.photoPath && (
                            <img 
                              src={progress.photoPath} alt="Progress" 
                              style={{ 
                                width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', 
                                border: '1px solid var(--border-color)', cursor: 'pointer' 
                              }}
                              onClick={() => window.open(progress.photoPath, '_blank')}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

      {/* Discard verification progress warning modal */}
      {showDiscardConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '400px', backgroundColor: 'var(--card-bg)',
            borderColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: 'var(--spacing-lg)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)',
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Discard Progress?
              </h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'var(--spacing-lg)' }}>
              Are you sure you want to discard your task completion progress? Any attached photo or verification details will be lost.
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => setShowDiscardConfirm(false)}
              >
                Go Back
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={() => {
                  closeVerificationModal();
                  setShowDiscardConfirm(false);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '400px', backgroundColor: 'var(--card-bg)',
            borderColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: 'var(--spacing-lg)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)',
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Confirm Deletion
              </h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: 'var(--spacing-lg)' }}>
              {deleteMode === 'single' ? (
                <>Are you sure you want to delete the task <strong style={{ color: 'var(--text-main)' }}>{taskToDelete?.title}</strong>? This will permanently remove it from the register.</>
              ) : (
                <>Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{selectedTasks.length}</strong> selected tasks? This action cannot be undone.</>
              )}
            </p>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTaskToDelete(null);
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={async () => {
                  if (deleteMode === 'single') {
                    await executeSingleDelete(taskToDelete?._id);
                  } else {
                    await executeBulkDelete();
                  }
                  setShowDeleteConfirm(false);
                  setTaskToDelete(null);
                }}
                style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default Tasks;
