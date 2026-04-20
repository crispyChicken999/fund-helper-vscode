/**
 * 复制 webview 静态文件到 out 目录
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'webview');
const outDir = path.join(__dirname, '..', 'out', 'webview');

// 确保输出目录存在
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 复制文件
const files = ['main.js', 'style.css'];

files.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const outFile = path.join(outDir, file);
  
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, outFile);
    console.log(`✓ Copied ${file} to out/webview/`);
  } else {
    console.warn(`⚠ Warning: ${file} not found in src/webview/`);
  }
});

console.log('Webview files copied successfully!');
