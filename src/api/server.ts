
// Simple server-like API handler for development and production
export class ServerAPI {
  private static instance: ServerAPI;
  
  private constructor() {
    this.initializeAPI();
  }
  
  public static getInstance(): ServerAPI {
    if (!ServerAPI.instance) {
      ServerAPI.instance = new ServerAPI();
    }
    return ServerAPI.instance;
  }
  
  private initializeAPI() {
    //console.log('Initializing server API for JobTracker');
    
    // Set up CORS headers for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      //console.log('Development mode: Setting up CORS handling');
    }
  }
  
  public async handleApplicationSubmission(jobData: any): Promise<any> {
    //console.log('Server API: Handling application submission', jobData);
    
    try {
      // Validate the data
      if (!jobData.company && !jobData.position) {
        throw new Error('Missing required fields: company or position');
      }
      
      // Process the job application
      const processedApplication = {
        id: Date.now().toString(),
        company: jobData.company || '',
        position: jobData.position || '',
        location: jobData.location || '',
        salary: jobData.salary || '',
        jobUrl: jobData.jobUrl || '',
        description: jobData.description || '',
        appliedDate: jobData.appliedDate || new Date().toISOString().split('T')[0],
        status: jobData.status || 'Applied',
        notes: jobData.notes || '',
        extractedAt: jobData.extractedAt || new Date().toISOString()
      };
      
      // Save to localStorage (simulating database save)
      const existingApplicationsJson = localStorage.getItem('jobApplications');
      const existingApplications = existingApplicationsJson ? JSON.parse(existingApplicationsJson) : [];
      const applications = Array.isArray(existingApplications) ? existingApplications : [];
      
      // Check for duplicates
      const isDuplicate = applications.some((app: any) => 
        app.company.toLowerCase() === processedApplication.company.toLowerCase() &&
        app.position.toLowerCase() === processedApplication.position.toLowerCase() &&
        (app.jobUrl === processedApplication.jobUrl || (!app.jobUrl && !processedApplication.jobUrl))
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'Duplicate application',
          message: 'This application already exists' 
        };
      }
      
      // Add to beginning of array
      applications.unshift(processedApplication);
      
      // Save back to localStorage
      localStorage.setItem('jobApplications', JSON.stringify(applications));
      
      //console.log('Server API: Application saved successfully', processedApplication);
      
      // Trigger a storage event to notify the Applications component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'jobApplications',
        newValue: JSON.stringify(applications)
      }));
      
      return { 
        success: true, 
        data: processedApplication,
        message: 'Application saved successfully'
      };
      
    } catch (error) {
      console.error('Server API: Error processing application:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

// Initialize the server API
//console.log('Initializing Server API handler');
ServerAPI.getInstance();
