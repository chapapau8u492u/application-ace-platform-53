import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Download, Chrome, FileText, Zap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { downloadExtension } from '../api/simpleDownload';

export const ExtensionDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsDownloading(true);
    
    try {
      await downloadExtension();

      toast({
        title: "Extension Downloaded!",
        description: "Check your downloads folder and follow the installation instructions.",
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the extension. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <Chrome className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Download JobTracker Extension</CardTitle>
        <CardDescription className="text-lg">
          Get our Chrome extension to automatically extract and save job applications
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-green-500" />
            <span className="text-sm">Auto Extract</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="text-sm">One-Click Save</span>
          </div>
          <div className="flex items-center space-x-2">
            <Chrome className="h-5 w-5 text-orange-500" />
            <span className="text-sm">Chrome Ready</span>
          </div>
        </div>

        {/* Download Button */}
        <div className="text-center">
          <Button 
            onClick={handleDownload}
            disabled={isDownloading}
            size="lg"
            className="w-full md:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Preparing Download...' : 'Download Extension'}
          </Button>
        </div>

        {/* Installation Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900">Installation Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Download the extension zip file</li>
            <li>Extract the zip file to a folder</li>
            <li>Open Chrome and go to <code className="bg-gray-200 px-1 rounded">chrome://extensions/</code></li>
            <li>Enable "Developer mode" in the top right</li>
            <li>Click "Load unpacked" and select the extracted folder</li>
            <li>Start using the extension on job sites!</li>
          </ol>
        </div>

        {/* Supported Sites */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Works on:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">LinkedIn</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">Internshala</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">Indeed</span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Naukri</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
