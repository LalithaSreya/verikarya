const fs = require('fs');
const path = require('path');

function checkCasing(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        checkCasing(full);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = content.match(/require\(['\"].+?['\"]\)/g) || [];
      matches.forEach(match => {
        let reqPath = match.match(/['\"](.+?)['\"]/)[1];
        if (reqPath.startsWith('.')) {
          const resolved = path.resolve(path.dirname(full), reqPath);
          const base = path.basename(resolved);
          const parent = path.dirname(resolved);
          
          let exactMatch = false;
          if (fs.existsSync(resolved + '.js') || fs.existsSync(resolved)) {
            const files = fs.readdirSync(parent);
            const possibleNames = [base, base + '.js'];
            exactMatch = files.some(f => possibleNames.includes(f));
            if (!exactMatch) {
              console.log(`CASING DISCREPANCY in ${full} requiring "${reqPath}"`);
            }
          } else {
            console.log(`FILE NOT FOUND in ${full} requiring "${reqPath}"`);
          }
        }
      });
    }
  });
}

console.log('Checking backend import casings...');
checkCasing('backend');
console.log('Casing check complete!');
