export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { serif: ['"Times New Roman"', 'SimSun', '"Songti SC"', '"Noto Serif SC"', 'serif'], sans: ['system-ui', '"Microsoft YaHei"', 'sans-serif'] },
    screens: { print: { raw: 'print' } },
  } },
  plugins: [],
}
