import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'images', dest: '.' },
        { src: 'background.js', dest: '.' }
      ]
    }),
    {
      name: 'fix-html-paths',
      apply: 'build',
      closeBundle() {
        const htmlPath = join(__dirname, 'dist/popup/index.html');
        if (existsSync(htmlPath)) {
          // 读取HTML内容并修改路径为相对路径
          let htmlContent = readFileSync(htmlPath, 'utf-8');
          htmlContent = htmlContent.replace(/src="\.\.\/popup\//g, 'src="./');
          htmlContent = htmlContent.replace(/href="\.\.\/popup\//g, 'href="./');
          
          // 写回文件
          writeFileSync(htmlPath, htmlContent);
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // 不压缩代码，保留原始格式
    sourcemap: true, // 生成 sourcemap 便于调试
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'popup/index.html'),
        'extract-content': resolve(__dirname, 'scripts/extract-content.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // extract-content.js 输出到 scripts/ 目录
          if (chunkInfo.name === 'extract-content') {
            return 'scripts/[name].js';
          }
          // 其他文件输出到 popup/ 目录
          return 'popup/[name].js';
        },
        chunkFileNames: 'popup/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return 'popup/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
        // 保留原始代码格式
        compact: false,
        // 使用可读的变量名
        generatedCode: {
          constBindings: true
        }
      }
    }
  }
});

