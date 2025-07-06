
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Building2, Calendar, ExternalLink, MapPin, DollarSign, Eye, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApplicationForm } from './ApplicationForm';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface JobApplication {
  id: string;
  company: string;
  position: string;
  location?: string;
  salary?: string;
  jobUrl?: string;
  description?: string;
  status: 'Applied' | 'Interview Scheduled' | 'Under Review' | 'Rejected' | 'Offer';
  appliedDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

const statusConfig = {
  'Applied': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: '📝',
    gradient: 'from-blue-500 to-blue-600'
  },
  'Interview Scheduled': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: '📅',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  'Under Review': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: '👀',
    gradient: 'from-amber-500 to-amber-600'
  },
  'Rejected': { 
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: '❌',
    gradient: 'from-red-500 to-red-600'
  },
  'Offer': { 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: '🎉',
    gradient: 'from-purple-500 to-purple-600'
  }
};

const BACKEND_URL = 'http://localhost:3001';

export const Applications = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      setBackendConnected(response.ok);
    } catch (error) {
      setBackendConnected(false);
    }
  };

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/applications`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded applications from backend:', data.applications);
        setApplications(data.applications || []);
        setBackendConnected(true);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.log('Backend not available, using localStorage');
      setBackendConnected(false);
      
      const savedApplications = localStorage.getItem('jobApplications');
      if (savedApplications) {
        try {
          const parsed = JSON.parse(savedApplications);
          setApplications(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
          console.error('Error loading from localStorage:', error);
          setApplications([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addApplication = async (applicationData: Partial<JobApplication>) => {
    console.log('Adding application:', applicationData);
    
    if (!applicationData.company && !applicationData.position) {
      console.warn('Insufficient application data:', applicationData);
      return;
    }

    const newApplication = {
      company: applicationData.company || 'Unknown Company',
      position: applicationData.position || 'Unknown Position',
      location: applicationData.location || '',
      salary: applicationData.salary || '',
      jobUrl: applicationData.jobUrl || '',
      description: applicationData.description || '',
      status: (applicationData.status as JobApplication['status']) || 'Applied',
      appliedDate: applicationData.appliedDate || new Date().toISOString().split('T')[0],
      notes: applicationData.notes || ''
    };

    if (backendConnected) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newApplication)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Application added successfully:', result.data);
          loadApplications();
          toast({
            title: "Application Added Successfully! 🎉",
            description: `${newApplication.position} at ${newApplication.company}`,
          });
          return;
        } else if (response.status === 409) {
          toast({
            title: "Duplicate Application",
            description: "This application already exists in your tracker",
            variant: "destructive"
          });
          return;
        } else {
          throw new Error('Failed to save to backend');
        }
      } catch (error) {
        console.error('Error adding to backend:', error);
      }
    }
    
    // Fallback to localStorage
    const localApplication: JobApplication = {
      id: Date.now().toString(),
      ...newApplication
    };
    
    const isDuplicate = applications.some(app => 
      app.company.toLowerCase() === localApplication.company.toLowerCase() &&
      app.position.toLowerCase() === localApplication.position.toLowerCase()
    );
    
    if (isDuplicate) {
      toast({
        title: "Duplicate Application",
        description: "This application already exists in your tracker",
        variant: "destructive"
      });
      return;
    }
    
    const updatedApplications = [localApplication, ...applications];
    setApplications(updatedApplications);
    localStorage.setItem('jobApplications', JSON.stringify(updatedApplications));
    
    toast({
      title: "Application Added",
      description: `Added ${localApplication.position} at ${localApplication.company}`,
    });
  };

  const updateApplication = async (id: string, applicationData: Partial<JobApplication>) => {
    if (backendConnected) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(applicationData)
        });

        if (response.ok) {
          loadApplications();
          toast({
            title: "Application Updated",
            description: "Application has been updated successfully",
          });
          return;
        }
      } catch (error) {
        console.error('Error updating backend:', error);
      }
    }
    
    // Fallback to localStorage
    const updatedApplications = applications.map(app => 
      app.id === id ? { ...app, ...applicationData } : app
    );
    setApplications(updatedApplications);
    localStorage.setItem('jobApplications', JSON.stringify(updatedApplications));
    
    toast({
      title: "Application Updated",
      description: "Application updated successfully",
    });
  };

  const deleteApplication = async (id: string) => {
    if (backendConnected) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          loadApplications();
          toast({
            title: "Application Deleted",
            description: "Application has been removed successfully",
          });
          return;
        }
      } catch (error) {
        console.error('Error deleting from backend:', error);
      }
    }
    
    // Fallback to localStorage
    const updatedApplications = applications.filter(app => app.id !== id);
    setApplications(updatedApplications);
    localStorage.setItem('jobApplications', JSON.stringify(updatedApplications));
    
    toast({
      title: "Application Deleted",
      description: "Application removed successfully",
    });
  };

  const editApplication = (app: JobApplication) => {
    setEditingApp(app);
    setShowForm(true);
  };

  const viewApplication = (app: JobApplication) => {
    setSelectedApp(app);
    setShowViewDialog(true);
  };

  // Fixed search functionality
  const filteredApplications = applications.filter(app => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      app.company.toLowerCase().includes(searchLower) ||
      app.position.toLowerCase().includes(searchLower) ||
      (app.location && app.location.toLowerCase().includes(searchLower)) ||
      (app.salary && app.salary.toLowerCase().includes(searchLower))
    );
    const matchesFilter = filterStatus === 'All' || app.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const updateApplicationStatus = async (id: string, newStatus: JobApplication['status']) => {
    await updateApplication(id, { status: newStatus });
  };

  const handleFormSubmit = async (applicationData: Partial<JobApplication>) => {
    if (editingApp) {
      await updateApplication(editingApp.id, applicationData);
      setEditingApp(null);
    } else {
      await addApplication(applicationData);
    }
    setShowForm(false);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingApp(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      {!backendConnected && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-orange-800 text-sm font-medium">
              Backend offline - Using local storage
            </span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Applications</h1>
            <div className="flex items-center gap-4 text-slate-600">
              <span className="text-lg">Tracking {applications.length} opportunities</span>
              {backendConnected && <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Live Connected
              </span>}
            </div>
          </div>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Application
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search companies, positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[200px] font-medium"
            >
              <option value="All">All Status ({applications.length})</option>
              <option value="Applied">Applied ({applications.filter(app => app.status === 'Applied').length})</option>
              <option value="Under Review">Under Review ({applications.filter(app => app.status === 'Under Review').length})</option>
              <option value="Interview Scheduled">Interview Scheduled ({applications.filter(app => app.status === 'Interview Scheduled').length})</option>
              <option value="Offer">Offer ({applications.filter(app => app.status === 'Offer').length})</option>
              <option value="Rejected">Rejected ({applications.filter(app => app.status === 'Rejected').length})</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      {searchTerm && (
        <div className="text-slate-600 text-sm">
          Found {filteredApplications.length} result{filteredApplications.length !== 1 ? 's' : ''} for "{searchTerm}"
        </div>
      )}

      {/* Applications Display */}
      {filteredApplications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {applications.length === 0 ? 'Start Your Journey' : 'No Results Found'}
            </h3>
            <p className="text-slate-600 mb-6 text-lg leading-relaxed">
              {applications.length === 0 
                ? 'Ready to take control of your job search? Add your first application to get started.'
                : 'Try adjusting your search terms or filters to find what you\'re looking for.'
              }
            </p>
            {applications.length === 0 && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Application
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((app) => (
            <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${statusConfig[app.status].gradient} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                    {app.company.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{app.company}</h3>
                    <p className="text-slate-600 font-medium">{app.position}</p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewApplication(app)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editApplication(app)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteApplication(app.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 mb-4">
                {app.location && (
                  <div className="flex items-center space-x-2 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{app.location}</span>
                  </div>
                )}
                {app.salary && (
                  <div className="flex items-center space-x-2 text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">{app.salary}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Applied {app.appliedDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <select
                  value={app.status}
                  onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all hover:shadow-md ${statusConfig[app.status].color}`}
                >
                  <option value="Applied">📝 Applied</option>
                  <option value="Under Review">👀 Under Review</option>
                  <option value="Interview Scheduled">📅 Interview Scheduled</option>
                  <option value="Offer">🎉 Offer</option>
                  <option value="Rejected">❌ Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredApplications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {app.company.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{app.company}</h3>
                        {app.jobUrl && (
                          <button 
                            onClick={() => window.open(app.jobUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50"
                            title="View job posting"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium text-base mb-2">{app.position}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        {app.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{app.location}</span>
                          </div>
                        )}
                        {app.salary && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{app.salary}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Applied {app.appliedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                      className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${statusConfig[app.status].color}`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Interview Scheduled">Interview Scheduled</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => viewApplication(app)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editApplication(app)}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteApplication(app.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      {showForm && (
        <ApplicationForm
          application={editingApp}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Improved View Application Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Application Details</DialogTitle>
            <DialogDescription>
              Complete information about this job application
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6">
              {/* Company Header */}
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className={`w-20 h-20 bg-gradient-to-br ${statusConfig[selectedApp.status].gradient} rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                  {selectedApp.company.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-slate-900 mb-1">{selectedApp.company}</h2>
                  <p className="text-xl text-slate-600 mb-2">{selectedApp.position}</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${statusConfig[selectedApp.status].color}`}>
                    <span>{statusConfig[selectedApp.status].icon}</span>
                    {selectedApp.status}
                  </div>
                </div>
              </div>
              
              {/* Application Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Applied Date</label>
                    <p className="text-lg text-slate-900 font-medium mt-1">{selectedApp.appliedDate}</p>
                  </div>
                  
                  {selectedApp.location && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Location</label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <p className="text-lg text-slate-900 font-medium">{selectedApp.location}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {selectedApp.salary && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Salary</label>
                      <div className="flex items-center gap-2 mt-1">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        <p className="text-lg text-slate-900 font-medium">{selectedApp.salary}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedApp.createdAt && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Added to Tracker</label>
                      <p className="text-lg text-slate-900 font-medium mt-1">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Job URL */}
              {selectedApp.jobUrl && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Job Posting</label>
                  <a 
                    href={selectedApp.jobUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 underline font-medium break-all"
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    View Original Job Posting
                  </a>
                </div>
              )}
              
              {/* Description */}
              {selectedApp.description && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Job Description</label>
                  <div className="text-slate-900 whitespace-pre-line text-sm leading-relaxed max-h-40 overflow-y-auto">
                    {selectedApp.description}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              {selectedApp.notes && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Notes</label>
                  <p className="text-slate-900 whitespace-pre-line text-sm leading-relaxed">{selectedApp.notes}</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewDialog(false);
                    editApplication(selectedApp);
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Application
                </Button>
                {selectedApp.jobUrl && (
                  <Button
                    onClick={() => window.open(selectedApp.jobUrl, '_blank')}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Job Posting
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
