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

const BACKEND_URL = 'https://job-hunter-backend-sigma.vercel.app/';

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
      const response = await fetch(`https://job-hunter-backend-sigma.vercel.app/health`);
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
        //console.log('Loaded applications from backend:', data.applications);
        setApplications(data.applications || []);
        setBackendConnected(true);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      //console.log('Backend not available, using localStorage');
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
    //console.log('Adding application:', applicationData);
    
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
          //console.log('Application added successfully:', result.data);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Connection Status */}
        {!backendConnected && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse mr-3"></div>
              <span className="text-amber-800 text-sm font-medium">
                Backend offline - Using local storage
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Applications</h1>
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <span className="font-medium">{applications.length} Total Applications</span>
                </div>
                {backendConnected && (
                  <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 text-sm font-medium">Live Connected</span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Application
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 items-center w-full lg:w-auto">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search companies, positions, locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[200px] font-medium text-gray-700"
                >
                  <option value="All">All Status ({applications.length})</option>
                  <option value="Applied">Applied ({applications.filter(app => app.status === 'Applied').length})</option>
                  <option value="Under Review">Under Review ({applications.filter(app => app.status === 'Under Review').length})</option>
                  <option value="Interview Scheduled">Interview Scheduled ({applications.filter(app => app.status === 'Interview Scheduled').length})</option>
                  <option value="Offer">Offer ({applications.filter(app => app.status === 'Offer').length})</option>
                  <option value="Rejected">Rejected ({applications.filter(app => app.status === 'Rejected').length})</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results count */}
        {searchTerm && (
          <div className="mb-4 text-gray-600 text-sm font-medium">
            Showing {filteredApplications.length} result{filteredApplications.length !== 1 ? 's' : ''} for "{searchTerm}"
          </div>
        )}

        {/* Applications Display */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {applications.length === 0 ? 'Ready to Start Tracking' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {applications.length === 0 
                  ? 'Organize your job search with our professional application tracker. Add your first application to get started.'
                  : 'Try adjusting your search terms or filters to find what you\'re looking for.'
                }
              </p>
              {applications.length === 0 && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium"
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
              <div key={app.id} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card Header - Fixed layout */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-sm flex-shrink-0">
                        {app.company.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={app.company}>
                          {app.company}
                        </h3>
                        <p className="text-gray-600 font-medium text-sm truncate" title={app.position}>{app.position}</p>
                      </div>
                    </div>
                    
                    {/* Fixed action button positioning */}
                    <div className="flex-shrink-0 ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg z-50">
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

                  {/* Status and Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${statusConfig[app.status].dotColor}`}></div>
                      <span className="text-xs font-medium text-gray-600">{app.status}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">{app.appliedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 space-y-4">
                  {app.location && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{app.location}</span>
                    </div>
                  )}
                  {app.salary && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{app.salary}</span>
                    </div>
                  )}
                  
                  {/* Status Selector */}
                  <div className="pt-2">
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 cursor-pointer"
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
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredApplications.map((app) => (
                <div key={app.id} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0 pr-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
                        {app.company.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900 text-base truncate flex-1" title={app.company}>{app.company}</h3>
                          {app.jobUrl && (
                            <button 
                              onClick={() => window.open(app.jobUrl, '_blank')}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 flex-shrink-0"
                              title="View job posting"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 font-medium text-sm mb-2 truncate" title={app.position}>{app.position}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {app.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{app.location}</span>
                            </div>
                          )}
                          {app.salary && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="truncate">{app.salary}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>Applied {app.appliedDate}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fixed action buttons positioning */}
                    <div className="flex items-center space-x-4 flex-shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => updateApplicationStatus(app.id, e.target.value as JobApplication['status'])}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 cursor-pointer min-w-[140px]"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Offer">Offer</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg z-50">
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

        {/* Application Details Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900">Application Details</DialogTitle>
              <DialogDescription className="text-gray-600">
                Complete information for this job application
              </DialogDescription>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-6">
                {/* Company Header */}
                <div className="flex items-center space-x-4 p-6 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm flex-shrink-0">
                    {selectedApp.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedApp.company}</h2>
                    <p className="text-lg text-gray-700 mb-2 font-medium">{selectedApp.position}</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${statusConfig[selectedApp.status].dotColor}`}></div>
                      <span className="text-gray-600 font-medium">{selectedApp.status}</span>
                    </div>
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <label className="text-sm font-medium text-gray-700">Application Date</label>
                      </div>
                      <p className="text-gray-900 font-medium">{selectedApp.appliedDate}</p>
                    </div>
                    
                    {selectedApp.location && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          <label className="text-sm font-medium text-gray-700">Location</label>
                        </div>
                        <p className="text-gray-900 font-medium">{selectedApp.location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {selectedApp.salary && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-4 h-4 text-gray-600" />
                          <label className="text-sm font-medium text-gray-700">Salary</label>
                        </div>
                        <p className="text-gray-900 font-medium">{selectedApp.salary}</p>
                      </div>
                    )}
                    
                    {selectedApp.createdAt && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <label className="text-sm font-medium text-gray-700">Added to Tracker</label>
                        </div>
                        <p className="text-gray-900 font-medium">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Job URL */}
                {selectedApp.jobUrl && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <ExternalLink className="w-4 h-4 text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">Job Posting</label>
                    </div>
                    <a 
                      href={selectedApp.jobUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium underline"
                    >
                      <span>View Original Job Posting</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
                
                {/* Description */}
                {selectedApp.description && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Job Description</label>
                    <div className="text-gray-700 whitespace-pre-line max-h-48 overflow-y-auto">
                      {selectedApp.description}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedApp.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
                    <p className="text-gray-700 whitespace-pre-line">{selectedApp.notes}</p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewDialog(false);
                      editApplication(selectedApp);
                    }}
                    className="flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </Button>
                  {selectedApp.jobUrl && (
                    <Button
                      onClick={() => window.open(selectedApp.jobUrl, '_blank')}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Job</span>
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
