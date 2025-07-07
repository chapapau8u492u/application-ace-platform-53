
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Phone, Plus, Edit3, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: 'Applied' | 'Interview Scheduled' | 'Under Review' | 'Rejected' | 'Offer';
  appliedDate: string;
}

interface Interview {
  id: string;
  applicationId: string;
  company: string;
  position: string;
  date: string;
  time: string;
  type: 'Video Call' | 'On-site' | 'Phone Call';
  location?: string;
  meetingLink?: string;
  notes?: string;
  interviewer?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

interface UpcomingInterviewsProps {
  applications: JobApplication[];
}

export const UpcomingInterviews: React.FC<UpcomingInterviewsProps> = ({ applications }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [formData, setFormData] = useState({
    applicationId: '',
    company: '',
    position: '',
    date: '',
    time: '',
    type: 'Video Call' as Interview['type'],
    location: '',
    meetingLink: '',
    notes: '',
    interviewer: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load interviews from localStorage
    const savedInterviews = localStorage.getItem('interviews');
    if (savedInterviews) {
      try {
        const parsed = JSON.parse(savedInterviews);
        setInterviews(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Error loading interviews:', error);
        setInterviews([]);
      }
    }
  }, []);

  useEffect(() => {
    // Save interviews to localStorage whenever they change
    localStorage.setItem('interviews', JSON.stringify(interviews));
  }, [interviews]);

  const scheduledApplications = applications.filter(app => app.status === 'Interview Scheduled');
  const upcomingInterviews = interviews.filter(interview => 
    interview.status === 'Scheduled' && 
    new Date(interview.date + 'T' + interview.time) > new Date()
  );

  const getIconForType = (type: Interview['type']) => {
    switch (type) {
      case 'Video Call': return Video;
      case 'On-site': return MapPin;
      case 'Phone Call': return Phone;
      default: return Clock;
    }
  };

  const getColorForType = (type: Interview['type']) => {
    switch (type) {
      case 'Video Call': return 'text-blue-600 bg-blue-50';
      case 'On-site': return 'text-green-600 bg-green-50';
      case 'Phone Call': return 'text-purple-600 bg-purple-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company || !formData.position || !formData.date || !formData.time) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const interviewData: Interview = {
      id: selectedInterview?.id || Date.now().toString(),
      applicationId: formData.applicationId,
      company: formData.company,
      position: formData.position,
      date: formData.date,
      time: formData.time,
      type: formData.type,
      location: formData.location,
      meetingLink: formData.meetingLink,
      notes: formData.notes,
      interviewer: formData.interviewer,
      status: 'Scheduled'
    };

    if (selectedInterview) {
      // Update existing interview
      setInterviews(prev => 
        prev.map(interview => 
          interview.id === selectedInterview.id ? interviewData : interview
        )
      );
      toast({
        title: "Interview Updated! 📅",
        description: `${interviewData.position} at ${interviewData.company}`,
      });
      setShowEditForm(false);
    } else {
      // Add new interview
      setInterviews(prev => [...prev, interviewData]);
      toast({
        title: "Interview Scheduled! 📅",
        description: `${interviewData.position} at ${interviewData.company}`,
      });
      setShowAddForm(false);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      applicationId: '',
      company: '',
      position: '',
      date: '',
      time: '',
      type: 'Video Call',
      location: '',
      meetingLink: '',
      notes: '',
      interviewer: ''
    });
    setSelectedInterview(null);
  };

  const deleteInterview = (id: string) => {
    setInterviews(prev => prev.filter(interview => interview.id !== id));
    toast({
      title: "Interview Cancelled",
      description: "Interview has been removed from your schedule",
    });
  };

  const editInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setFormData({
      applicationId: interview.applicationId,
      company: interview.company,
      position: interview.position,
      date: interview.date,
      time: interview.time,
      type: interview.type,
      location: interview.location || '',
      meetingLink: interview.meetingLink || '',
      notes: interview.notes || '',
      interviewer: interview.interviewer || ''
    });
    setShowEditForm(true);
  };

  const joinInterview = (interview: Interview) => {
    if (interview.meetingLink) {
      window.open(interview.meetingLink, '_blank');
    } else {
      toast({
        title: "No Meeting Link",
        description: "This interview doesn't have a meeting link",
        variant: "destructive"
      });
    }
  };

  const markAsCompleted = (id: string) => {
    setInterviews(prev => 
      prev.map(interview => 
        interview.id === id ? { ...interview, status: 'Completed' } : interview
      )
    );
    toast({
      title: "Interview Completed",
      description: "Interview marked as completed",
    });
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date + 'T' + time);
    return {
      date: dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: dateObj.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Upcoming Interviews</h2>
          <p className="text-slate-600 text-sm">
            {upcomingInterviews.length > 0 
              ? `${upcomingInterviews.length} interviews scheduled`
              : `${scheduledApplications.length} applications ready for scheduling`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {upcomingInterviews.length > 0 ? (
          upcomingInterviews.map((interview) => {
            const IconComponent = getIconForType(interview.type);
            const colorClass = getColorForType(interview.type);
            const { date, time } = formatDateTime(interview.date, interview.time);
            const isToday = new Date(interview.date).toDateString() === new Date().toDateString();
            
            return (
              <div key={interview.id} className={`flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 transition-colors group ${isToday ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-12 h-12 ${colorClass.split(' ')[1]} rounded-xl flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{interview.company}</h3>
                      {isToday && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-1">{interview.position}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span className="font-medium">{date}</span>
                      <span>{time}</span>
                      <span className={`font-medium ${colorClass.split(' ')[0]}`}>{interview.type}</span>
                      {interview.interviewer && (
                        <span>with {interview.interviewer}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => joinInterview(interview)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {interview.type === 'Video Call' ? 'Join' : 
                     interview.type === 'Phone Call' ? 'Call' : 'Navigate'}
                  </Button>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => editInterview(interview)}
                      className="text-slate-400 hover:text-slate-600 p-2"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => markAsCompleted(interview.id)}
                      className="text-green-600 hover:text-green-700 p-2"
                      title="Mark as completed"
                    >
                      ✓
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteInterview(interview.id)}
                      className="text-slate-400 hover:text-red-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : scheduledApplications.length > 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Schedule</h3>
            <p className="text-slate-600 mb-4">
              You have {scheduledApplications.length} applications with interviews to schedule
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Interviews Scheduled</h3>
            <p className="text-slate-600 mb-4">
              Interviews will appear here once you schedule them
            </p>
            <Button 
              onClick={() => setShowAddForm(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Interview
            </Button>
          </div>
        )}
      </div>

      {/* Add Interview Form */}
      <Dialog open={showAddForm} onOpenChange={(open) => { setShowAddForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Job position"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Interview['type'] }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Video Call">Video Call</option>
                <option value="Phone Call">Phone Call</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            {formData.type === 'Video Call' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link</label>
                <Input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {formData.type === 'On-site' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Office address"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interviewer</label>
              <Input
                value={formData.interviewer}
                onChange={(e) => setFormData(prev => ({ ...prev, interviewer: e.target.value }))}
                placeholder="Interviewer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setShowAddForm(false); resetForm(); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Interview Form */}
      <Dialog open={showEditForm} onOpenChange={(open) => { setShowEditForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Interview</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Same form structure as add form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="Company name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position *</label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="Job position"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Interview['type'] }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Video Call">Video Call</option>
                <option value="Phone Call">Phone Call</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            {formData.type === 'Video Call' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link</label>
                <Input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {formData.type === 'On-site' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Office address"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interviewer</label>
              <Input
                value={formData.interviewer}
                onChange={(e) => setFormData(prev => ({ ...prev, interviewer: e.target.value }))}
                placeholder="Interviewer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-20"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setShowEditForm(false); resetForm(); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
