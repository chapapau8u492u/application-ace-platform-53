
import React, { useState, useEffect } from 'react';
import { Building2, Calendar, MoreHorizontal, Eye, Edit3, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

const statusConfig = {
  'Applied': { color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Interview Scheduled': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Under Review': { color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Rejected': { color: 'bg-red-50 text-red-700 border-red-200' },
  'Offer': { color: 'bg-purple-50 text-purple-700 border-purple-200' }
};

const BACKEND_URL = 'https://job-hunter-backend-app.vercel.app';

export const RecentApplications = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/applications`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications?.slice(0, 4) || []);
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.log('Loading from localStorage fallback');
      const savedApplications = localStorage.getItem('jobApplications');
      if (savedApplications) {
        try {
          const parsed = JSON.parse(savedApplications);
          setApplications((Array.isArray(parsed) ? parsed : []).slice(0, 4));
        } catch (error) {
          console.error('Error loading from localStorage:', error);
          setApplications([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setApplications(prev => prev.filter(app => app.id !== id));
        toast({
          title: "Application Deleted",
          description: "Application has been removed successfully",
        });
      } else {
        throw new Error('Failed to delete from backend');
      }
    } catch (error) {
      // Fallback to local deletion
      setApplications(prev => prev.filter(app => app.id !== id));
      const savedApplications = localStorage.getItem('jobApplications');
      if (savedApplications) {
        const parsed = JSON.parse(savedApplications);
        const updated = parsed.filter((app: JobApplication) => app.id !== id);
        localStorage.setItem('jobApplications', JSON.stringify(updated));
      }
      
      toast({
        title: "Application Deleted",
        description: "Application removed locally",
      });
    }
  };

  const viewApplication = (app: JobApplication) => {
    if (app.jobUrl) {
      window.open(app.jobUrl, '_blank');
    } else {
      toast({
        title: "No URL Available",
        description: "This application doesn't have a job URL",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Recent Applications</h2>
            <p className="text-slate-600 text-sm">Your latest job applications</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/applications'}>
            View All
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-500 font-medium">No Applications Yet</h3>
            <p className="text-slate-400 text-sm">Start tracking your job applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-lg">
                    {app.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{app.company}</h3>
                      {app.jobUrl && (
                        <button
                          onClick={() => viewApplication(app)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="View job posting"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{app.position}</p>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">Applied {app.appliedDate}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig[app.status].color}`}>
                    {app.status}
                  </span>
                  
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
                      <DropdownMenuItem>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
