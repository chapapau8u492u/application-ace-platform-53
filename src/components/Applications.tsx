import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Building2, Calendar, ExternalLink, MapPin, DollarSign, Eye, Edit3, Trash2, Briefcase, Clock } from 'lucide-react';
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
    gradient: 'from-blue-500 to-blue-600',
    dotColor: 'bg-blue-500'
  },
  'Interview Scheduled': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: '📅',
    gradient: 'from-emerald-500 to-emerald-600',
    dotColor: 'bg-emerald-500'
  },
  'Under Review': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: '👀',
    gradient: 'from-amber-500 to-amber-600',
    dotColor: 'bg-amber-500'
  },
  'Rejected': { 
    color: 'bg-red-50 text-red-700 border-red-200', 
    icon: '❌',
    gradient: 'from-red-500 to-red-600',
    dotColor: 'bg-red-500'
  },
  'Offer': { 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: '🎉',
    gradient: 'from-purple-500 to-purple-600',
    dotColor: 'bg-purple-500'
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Connection Status */}
        {!backendConnected && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-amber-800 text-sm font-medium">
                Backend offline - Using local storage
              </span>
            </div>
          </div>
        )}

        {/* Professional Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-3">Job Applications</h1>
                <div className="flex items-center space-x-6 text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-lg font-medium">{applications.length} Total Applications</span>
                  </div>
                  {backendConnected && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-400/30">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-emerald-300 text-sm font-medium">Live Connected</span>
                    </div>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Application
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex flex-1 gap-4 items-center w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search companies, positions, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 rounded-xl bg-slate-50 font-medium"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white min-w-[200px] font-medium text-slate-700"
              >
                <option value="All">All Status ({applications.length})</option>
                <option value="Applied">Applied ({applications.filter(app => app.status === 'Applied').length})</option>
                <option value="Under Review">Under Review ({applications.filter(app => app.status === 'Under Review').length})</option>
                <option value="Interview Scheduled">Interview Scheduled ({applications.filter(app => app.status === 'Interview Scheduled').length})</option>
                <option value="Offer">Offer ({applications.filter(app => app.status === 'Offer').length})</option>
                <option value="Rejected">Rejected ({applications.filter(app => app.status === 'Rejected').length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        {searchTerm && (
          <div className="text-slate-600 text-sm font-medium px-1">
            Showing {filteredApplications.length} result{filteredApplications.length !== 1 ? 's' : ''} for "{searchTerm}"
          </div>
        )}

        {/* Professional Applications Display */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-12 h-12 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                {applications.length === 0 ? 'Ready to Start Tracking' : 'No Results Found'}
              </h3>
              <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                {applications.length === 0 
                  ? 'Organize your job search with our professional application tracker. Add your first application to get started.'
                  : 'Try adjusting your search terms or filters to find what you\'re looking for.'
                }
              </p>
              {applications.length === 0 && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Application
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredApplications.map((app) => (
              <div key={app.id} className="group">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
                  {/* Professional Card Header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
                          {app.company.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-lg mb-1 truncate group-hover:text-slate-700 transition-colors">
                            {app.company}
                          </h3>
                          <p className="text-slate-600 font-semibold text-base truncate">{app.position}</p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => viewApplication(app)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-3" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editApplication(app)} className="cursor-pointer">
                            <Edit3 className="w-4 h-4 mr-3" />
                            Edit Application
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteApplication(app.id)}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Professional Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${statusConfig[app.status].dotColor}`}></div>
                        <span className="text-sm font-medium text-slate-600">{app.status}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-medium">{app.appliedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Card Content */}
                  <div className="p-6 space-y-4">
                    {app.location && (
                      <div className="flex items-center space-x-3 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">{app.location}</span>
                      </div>
                    )}
                    {app.salary && (
                      <div className="flex items-center space-x-3 text-slate-600">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">{app.salary}</span>
                      </div>
                    )}
                    
                    {/* Status Selector */}
                    <div className="pt-2">
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                        className="w-full px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50 cursor-pointer transition-colors"
                      >
                        <option value="Applied">📝 Applied</option>
                        <option value="Under Review">👀 Under Review</option>
                        <option value="Interview Scheduled">📅 Interview Scheduled</option>
                        <option value="Offer">🎉 Offer</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredApplications.map((app) => (
                <div key={app.id} className="p-6 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        {app.company.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-bold text-slate-900 text-lg truncate">{app.company}</h3>
                          {app.jobUrl && (
                            <button 
                              onClick={() => window.open(app.jobUrl, '_blank')}
                              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                              title="View job posting"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 font-semibold text-base mb-2 truncate">{app.position}</p>
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          {app.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span className="font-medium">{app.location}</span>
                            </div>
                          )}
                          {app.salary && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-medium">{app.salary}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span className="font-medium">Applied {app.appliedDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-4 flex-shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                        className="px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-slate-50 cursor-pointer"
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => viewApplication(app)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-3" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editApplication(app)} className="cursor-pointer">
                            <Edit3 className="w-4 h-4 mr-3" />
                            Edit Application
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteApplication(app.id)}
                            className="text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-3" />
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

        {/* Enhanced Application Details Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">Application Overview</DialogTitle>
              <DialogDescription className="text-slate-600">
                Comprehensive details for this job application
              </DialogDescription>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-8">
                {/* Professional Company Header */}
                <div className="flex items-center space-x-6 p-8 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                  <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0">
                    {selectedApp.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedApp.company}</h2>
                    <p className="text-xl text-slate-700 mb-3 font-semibold">{selectedApp.position}</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${statusConfig[selectedApp.status].dotColor}`}></div>
                      <span className="text-slate-600 font-medium">{selectedApp.status}</span>
                    </div>
                  </div>
                </div>
                
                {/* Professional Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-xl">
                      <div className="flex items-center space-x-2 mb-3">
                        <Calendar className="w-5 h-5 text-slate-600" />
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Application Date</label>
                      </div>
                      <p className="text-lg text-slate-900 font-semibold">{selectedApp.appliedDate}</p>
                    </div>
                    
                    {selectedApp.location && (
                      <div className="bg-slate-50 p-6 rounded-xl">
                        <div className="flex items-center space-x-2 mb-3">
                          <MapPin className="w-5 h-5 text-slate-600" />
                          <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Location</label>
                        </div>
                        <p className="text-lg text-slate-900 font-semibold">{selectedApp.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    {selectedApp.salary && (
                      <div className="bg-slate-50 p-6 rounded-xl">
                        <div className="flex items-center space-x-2 mb-3">
                          <DollarSign className="w-5 h-5 text-slate-600" />
                          <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Compensation</label>
                        </div>
                        <p className="text-lg text-slate-900 font-semibold">{selectedApp.salary}</p>
                      </div>
                    )}
                    
                    {selectedApp.createdAt && (
                      <div className="bg-slate-50 p-6 rounded-xl">
                        <div className="flex items-center space-x-2 mb-3">
                          <Clock className="w-5 h-5 text-slate-600" />
                          <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Added to Tracker</label>
                        </div>
                        <p className="text-lg text-slate-900 font-semibold">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Job URL */}
                {selectedApp.jobUrl && (
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <div className="flex items-center space-x-2 mb-3">
                      <ExternalLink className="w-5 h-5 text-slate-600" />
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Job Posting</label>
                    </div>
                    <a 
                      href={selectedApp.jobUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-slate-900 hover:text-slate-700 font-semibold underline underline-offset-4 transition-colors"
                    >
                      <span>View Original Job Posting</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                
                {/* Description */}
                {selectedApp.description && (
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 block">Job Description</label>
                    <div className="text-slate-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                      {selectedApp.description}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedApp.notes && (
                  <div className="bg-slate-50 p-6 rounded-xl">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 block">Personal Notes</label>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{selectedApp.notes}</p>
                  </div>
                )}
                
                {/* Professional Action Buttons */}
                <div className="flex justify-end space-x-4 pt-8 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewDialog(false);
                      editApplication(selectedApp);
                    }}
                    className="flex items-center space-x-2 px-6 py-3 font-semibold"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Application</span>
                  </Button>
                  {selectedApp.jobUrl && (
                    <Button
                      onClick={() => window.open(selectedApp.jobUrl, '_blank')}
                      className="flex items-center space-x-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Job Posting</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
