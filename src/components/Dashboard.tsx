import React, { useState, useEffect } from 'react';
import { StatsCards } from './StatsCards';
import { RecentApplications } from './RecentApplications';
import { ApplicationChart } from './ApplicationChart';
import { UpcomingInterviews } from './UpcomingInterviews';
import { Sparkles, TrendingUp, Target } from 'lucide-react';

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

const BACKEND_URL = 'https://job-hunter-backend-app.vercel.app';

export const Dashboard = () => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [userName, setUserName] = useState('Job Seeker');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApplications();
    setupWebSocket();
  }, []);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/applications`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
        
        if (data.applications && data.applications.length > 0) {
          setUserName('John');
        }
      } else {
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
      }
    } catch (error) {
      console.error('Error loading applications:', error);
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

  const setupWebSocket = () => {
    try {
      const websocket = new WebSocket(`ws://localhost:3001`);
      
      websocket.onopen = () => {
        //console.log('Dashboard WebSocket connected');
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'INITIAL_DATA':
              setApplications(data.applications || []);
              break;
            case 'NEW_APPLICATION':
              setApplications(prev => {
                const exists = prev.some(app => app.id === data.application.id);
                if (exists) return prev;
                return [data.application, ...prev];
              });
              break;
            case 'APPLICATION_UPDATED':
              setApplications(prev => 
                prev.map(app => 
                  app.id === data.application.id ? data.application : app
                )
              );
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        //console.log('Dashboard WebSocket disconnected');
        setTimeout(setupWebSocket, 5000);
      };
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl"></div>
          <div className="h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-600/90"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-48 -translate-y-48"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-4xl font-bold">
              Welcome back, {userName}! 🚀
            </h1>
          </div>
          <p className="text-xl text-blue-100 mb-6 max-w-3xl">
            {applications.length > 0 
              ? `You have ${applications.length} applications being tracked. Your AI-powered career journey continues with smart insights and personalized recommendations.`
              : "Ready to revolutionize your job search? Let our AI-powered platform guide you to your dream career with intelligent tracking and insights."
            }
          </p>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-xl">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Career Growth Mode</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-xl">
              <Target className="w-5 h-5" />
              <span className="font-semibold">AI Insights Active</span>
            </div>
          </div>
        </div>
      </div>
      
      <StatsCards applications={applications} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ApplicationChart />
        <UpcomingInterviews applications={applications} />
      </div>
      
      <RecentApplications />
    </div>
  );
};
