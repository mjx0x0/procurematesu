const fs = require('fs');
const path = require('path');

const targetDirs = ['dist', 'build', 'out'];
const sourceDir = '.next';

if (fs.existsSync(sourceDir)) {
  for (const dir of targetDirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.cpSync(sourceDir, dir, { recursive: true, force: true });
      if (fs.existsSync('public')) {
        fs.cpSync('public', path.join(dir, 'public'), { recursive: true, force: true });
      }
      console.log(`Successfully populated ${dir} with build artifacts.`);
    } catch (err) {
      console.error(`Warning: failed to copy artifacts to ${dir}:`, err);
    }
  }
}
