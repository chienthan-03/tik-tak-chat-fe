const fs = require('fs');
const path = require('path');

function renameJsToJsx(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      renameJsToJsx(filePath);
    } else if (file.endsWith('.js')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file contains JSX syntax (simple check for React components or JSX tags)
        if (content.includes('React.') || content.includes('import React') || 
            content.includes('<') && content.includes('/>') || 
            content.includes('render(') || content.includes('ReactDOM')) {
          
          const newPath = filePath.replace('.js', '.jsx');
          fs.renameSync(filePath, newPath);
          console.log(`Renamed ${filePath} to ${newPath}`);
          
          // If this is index.js, update the reference in index.html
          if (file === 'index.js') {
            const indexHtmlPath = path.join(process.cwd(), 'index.html');
            if (fs.existsSync(indexHtmlPath)) {
              let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
              htmlContent = htmlContent.replace('/src/index.js', '/src/index.jsx');
              fs.writeFileSync(indexHtmlPath, htmlContent);
              console.log('Updated index.html to reference index.jsx');
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  });
}

// Start from the src directory
renameJsToJsx(path.join(process.cwd(), 'src'));
console.log('Finished renaming files');
