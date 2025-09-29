
// Enhanced API handler for receiving job application data from the Chrome extension
const BACKEND_URL = 'https://job-hunter-backend-sigma.vercel.app';

export class ApplicationAPI {
  private static instance: ApplicationAPI;

  private constructor() {
    this.setupEventListeners();
    this.setupFetchHandler();
  }

  public static getInstance(): ApplicationAPI {
    if (!ApplicationAPI.instance) {
      ApplicationAPI.instance = new ApplicationAPI();
    }
    return ApplicationAPI.instance;
  }

  private setupEventListeners() {
    //console.log('Setting up application API event listeners');
    
    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
      if (event.data.type === 'JOB_APPLICATION_DATA') {
        //console.log('Received job application data via message:', event.data.jobData);
        this.handleJobApplicationData(event.data.jobData);
      }
    });

    // Listen for storage events
    window.addEventListener('storage', (event) => {
      if (event.key === 'extensionJobData' && event.newValue) {
        try {
          const jobData = JSON.parse(event.newValue);
          //console.log('Received job application data via storage:', jobData);
          this.handleJobApplicationData(jobData);
        } catch (error) {
          console.error('Error parsing storage job data:', error);
        }
      }
    });
  }

  private setupFetchHandler() {
    //console.log('Setting up fetch handler for extension API');
    
    // Intercept fetch requests to our API endpoint
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const url = input.toString();
      
      // Handle API requests from extension
      if (url.includes('/api/applications') && init?.method === 'POST') {
        try {
          //console.log('Intercepted fetch request to applications API');
          const body = init.body as string;
          const jobData = JSON.parse(body);
          
          //console.log('Processing job data from extension:', jobData);
          
          // Forward to backend
          const response = await fetch(`${BACKEND_URL}/api/applications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jobData)
          });
          
          if (response.ok) {
            const result = await response.json();
            //console.log('Application saved to backend:', result);
            
            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin'
              }
            });
          } else {
            const error = await response.json();
            return new Response(JSON.stringify(error), {
              status: response.status,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
        } catch (error) {
          console.error('Error processing extension request:', error);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Invalid request data',
            details: error.message 
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      // For all other requests, use the original fetch
      return originalFetch(input, init);
    };
  }

  private async handleJobApplicationData(jobData: any) {
    console.log('Handling job application data:', jobData);
    
    try {
      // Send to backend
      const response = await fetch(`${BACKEND_URL}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Job application processed successfully:', result);
        
        // Trigger a global refresh event
        this.triggerGlobalRefresh();
        
        // Also save to localStorage as backup
        this.saveToLocalStorage(jobData);
        
      } else {
        const error = await response.json();
        console.warn('Failed to process job application:', error);
        
        // Still save to localStorage as fallback
        this.saveToLocalStorage(jobData);
        this.triggerGlobalRefresh();
      }
    } catch (error) {
      console.error('Error handling job application data:', error);
      
      // Save to localStorage as fallback
      this.saveToLocalStorage(jobData);
      this.triggerGlobalRefresh();
    }
  }

  private saveToLocalStorage(jobData: any) {
    try {
      const existingApplications = JSON.parse(localStorage.getItem('jobApplications') || '[]');
      const newApplication = {
        id: jobData.id || Date.now().toString(),
        ...jobData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Check for duplicates
      const isDuplicate = existingApplications.some((app: any) => 
        app.company === newApplication.company && 
        app.position === newApplication.position &&
        app.jobUrl === newApplication.jobUrl
      );
      
      if (!isDuplicate) {
        existingApplications.unshift(newApplication);
        localStorage.setItem('jobApplications', JSON.stringify(existingApplications));
        console.log('Saved to localStorage:', newApplication);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private triggerGlobalRefresh() {
    // Dispatch a custom event that components can listen to
    const refreshEvent = new CustomEvent('jobApplicationAdded', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(refreshEvent);
    
    // Also trigger a storage event for additional compatibility
    const storageEvent = new StorageEvent('storage', {
      key: 'jobApplicationRefresh',
      newValue: Date.now().toString()
    });
    window.dispatchEvent(storageEvent);
    
    console.log('Triggered global refresh event');
  }
}

// Initialize the API handler
//console.log('Initializing Application API handler');
ApplicationAPI.getInstance();
