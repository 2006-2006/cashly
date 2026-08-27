const fs = require('fs');
const path = require('path');

function requireAll(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules') requireAll(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                console.log(`Loading ${fullPath}...`);
                require(fullPath);
                console.log(`✅ Loaded ${file}`);
            } catch (e) {
                console.log(`❌ Failed to load ${file}: ${e.message}`);
                console.log(e.stack);
            }
        }
    }
}

requireAll(__dirname);
