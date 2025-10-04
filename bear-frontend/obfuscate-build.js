const fs = require('fs');
const path = require('path');

const obfuscateCode = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\/\/.*$/gm, '');
    
    content = content.replace(/\s+/g, ' ');
    content = content.replace(/\s*([{}();,=])\s*/g, '$1');
    
    const variableMap = new Map();
    let counter = 0;
    
    content = content.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, (match) => {
      if (match.length > 2 && !['function', 'return', 'if', 'else', 'for', 'while', 'var', 'let', 'const'].includes(match)) {
        if (!variableMap.has(match)) {
          variableMap.set(match, `_${counter++}`);
        }
        return variableMap.get(match);
      }
      return match;
    });
    
    content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Obfuscated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error obfuscating ${filePath}:`, error);
  }
};

// Obfuscate all JS files in build directory
const obfuscateBuild = () => {
  const buildDir = path.join(__dirname, 'build');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Run "npm run build" first.');
    return;
  }
  
  const walkDir = (dir) => {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.js')) {
        obfuscateCode(filePath);
      }
    });
  };
  
  console.log('🔒 Starting code obfuscation...');
  walkDir(buildDir);
  console.log('✅ Code obfuscation complete!');
};

// Run obfuscation
obfuscateBuild();
