
import React from 'react';
import { Briefcase, Clock, CheckCircle, TrendingUp } from 'lucide-react';

interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: 'Applied' | 'Interview Scheduled' | 'Under Review' | 'Rejected' | 'Offer';
  appliedDate: string;
}

interface StatsCardsProps {
  applications: JobApplication[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ applications }) => {
  const totalApplications = applications.length;
  const interviewsScheduled = applications.filter(app => app.status === 'Interview Scheduled').length;
  const underReview = applications.filter(app => app.status === 'Under Review').length;
  const offers = applications.filter(app => app.status === 'Offer').length;

  // Calculate percentages based on total applications
  const calculatePercentage = (count: number) => {
    if (totalApplications === 0) return null;
    return Math.round((count / totalApplications) * 100);
  };

  const interviewPercentage = calculatePercentage(interviewsScheduled);
  const reviewPercentage = calculatePercentage(underReview);
  const offerPercentage = calculatePercentage(offers);

  const stats = [
    {
      title: 'Total Applications',
      value: totalApplications,
      icon: Briefcase,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: null, // No percentage for total
      changeColor: 'text-green-600'
    },
    {
      title: 'Under Review',
      value: underReview,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      change: reviewPercentage ? `${reviewPercentage}%` : null,
      changeColor: 'text-green-600'
    },
    {
      title: 'Interviews',
      value: interviewsScheduled,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      change: interviewPercentage ? `${interviewPercentage}%` : null,
      changeColor: 'text-green-600'
    },
    {
      title: 'Job Offers',
      value: offers,
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      change: offerPercentage ? `${offerPercentage}%` : null,
      changeColor: 'text-green-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
            </div>
            {stat.change && (
              <span className={`text-sm font-medium ${stat.changeColor}`}>
                {stat.change}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</h3>
            <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
