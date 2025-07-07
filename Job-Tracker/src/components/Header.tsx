
import React from 'react';
import { Search, Bell, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-8 py-6 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search applications, companies, or positions..."
              className="pl-12 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl transition-all duration-200"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-11 px-4 border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-200"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
          
          <Button 
            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Application
          </Button>
          
          <div className="w-11 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
