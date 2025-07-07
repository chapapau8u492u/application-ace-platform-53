
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', applications: 2, interviews: 0 },
  { name: 'Feb', applications: 5, interviews: 1 },
  { name: 'Mar', applications: 8, interviews: 2 },
  { name: 'Apr', applications: 12, interviews: 3 },
  { name: 'May', applications: 18, interviews: 4 },
  { name: 'Jun', applications: 24, interviews: 4 },
];

export const ApplicationChart = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Application Progress</h2>
        <p className="text-slate-600 text-sm">Your job search activity over time</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="applications"
              stroke="#3B82F6"
              fillOpacity={1}
              fill="url(#colorApplications)"
            />
            <Area
              type="monotone"
              dataKey="interviews"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#colorInterviews)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
