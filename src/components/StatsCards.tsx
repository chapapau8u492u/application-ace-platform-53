
import React from 'react';
import { Briefcase, Clock, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';

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
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700',
      change: null,
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Under Review',
      value: underReview,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-100',
      textColor: 'text-amber-700',
      change: reviewPercentage ? `${reviewPercentage}%` : null,
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Interviews Scheduled',
      value: interviewsScheduled,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50 to-green-100',
      textColor: 'text-emerald-700',
      change: interviewPercentage ? `${interviewPercentage}%` : null,
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Job Offers',
      value: offers,
      icon: Sparkles,
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-100',
      textColor: 'text-purple-700',
      change: offerPercentage ? `${offerPercentage}%` : null,
      changeColor: 'text-emerald-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
          
          <div className="flex items-center justify-between mb-6">
            <div className={`w-14 h-14 bg-gradient-to-r ${stat.bgGradient} rounded-2xl flex items-center justify-center shadow-lg`}>
              <stat.icon className={`w-7 h-7 ${stat.textColor}`} />
            </div>
            {stat.change && (
              <div className="flex items-center space-x-1 bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span className={`text-sm font-semibold ${stat.changeColor}`}>
                  {stat.change}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</h3>
            <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
          </div>
          
          <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        </div>
      ))}
    </div>
  );
};
