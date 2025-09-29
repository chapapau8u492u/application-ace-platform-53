// Simple client-side extension download using Google Drive link
export const downloadExtension = async (): Promise<void> => {
  try {
    console.log('Redirecting to Google Drive download...');
    
    // Open the Google Drive link directly
    window.open('https://drive.google.com/file/d/1yCMBIvN1KFxa6MNC47yVA5g3O3bWCCkq/view?usp=sharing', '_blank');
    
    console.log('Download initiated successfully');

  } catch (error) {
    console.error('Download error:', error);
    throw new Error(`Failed to download extension: ${error.message}`);
  }
};