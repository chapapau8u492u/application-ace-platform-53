
import React, { useState, useEffect } from 'react';
import { StatsCards } from './StatsCards';
import { RecentApplications } from './RecentApplications';
import { ApplicationChart } from './ApplicationChart';
import { UpcomingInterviews } from './UpcomingInterviews';

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

const BACKEND_URL = 'http://localhost:3001';

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
        
        // Set user name based on applications or default
        if (data.applications && data.applications.length > 0) {
          setUserName('John'); // You can make this dynamic later
        }
      } else {
        // Fallback to localStorage
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
      // Fallback to localStorage
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
        console.log('Dashboard WebSocket connected');
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
        console.log('Dashboard WebSocket disconnected');
        setTimeout(setupWebSocket, 5000);
      };
      
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-lg"></div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Welcome back, {userName}! 👋
        </h1>
        <p className="text-slate-600">
          {applications.length > 0 
            ? `You have ${applications.length} applications tracked. Here's your progress today.`
            : "Ready to start your job search journey? Add your first application to get started!"
          }
        </p>
      </div>
      
      <StatsCards applications={applications} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ApplicationChart />
        <UpcomingInterviews applications={applications} />
      </div>
      
      <RecentApplications />
    </div>
  );
};
