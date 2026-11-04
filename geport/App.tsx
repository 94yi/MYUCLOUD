import React, { useRef, useState } from 'react';
import './styles.css';
import { Sidebar } from './components/Sidebar';
import { CoverPreview } from './components/CoverPreview';
import { ZoomablePreview } from './components/ZoomablePreview';
import { CoverData, SmartLineConfig } from './types';
import { generateCoverPDF, generateCoverPDFViaPrint, mergePdf, downloadBlob } from './services/pdfService';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const coverRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current date for default values
  const today = new Date();
  const currentYear = today.getFullYear().toString();
  const currentMonth = (today.getMonth() + 1).toString();
  const currentDay = today.getDate().toString();

  // Initial State based on reference image
  const [data, setData] = useState<CoverData>({
    title: '缓冲区溢出攻击',
    course: '网络安全',
    className: '2024233333',
    studentId: '2022114514',
    name: '井芹  仁菜',
    department: '计算机学院（国家示范性软件学院）',
    dateYear: currentYear,
    dateMonth: currentMonth,
    dateDay: currentDay,
    headerImage: null,
    logoImage: null,
  });

  const [config, setConfig] = useState<SmartLineConfig>({
    titleMinWidth: '350px',
    fieldMinWidth: '250px',
  });

  // Handler: Download PNG
  const handleDownloadImage = async () => {
    if (!coverRef.current) return;
    setIsProcessing(true);
    try {
      const canvas = await html2canvas(coverRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `Cover_${data.name || 'LabReport'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error(err);
      alert('Failed to generate image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Print PDF (uses browser's native print for accurate rendering)
  const handlePrintPdf = () => {
    if (!coverRef.current) return;
    generateCoverPDFViaPrint(coverRef.current);
  };

  // Handler: Merge PDF
  const handleMergePdf = async (file: File) => {
    if (!coverRef.current) return;
    setIsProcessing(true);
    try {
      // 1. Generate Cover PDF buffer
      const coverBuffer = await generateCoverPDF(coverRef.current);

      // 2. Merge with user PDF
      const mergedPdfBytes = await mergePdf(coverBuffer, file);

      // 3. Download result
      downloadBlob(mergedPdfBytes, `Report_Complete_${data.name || 'Merged'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to merge PDF. Please ensure your uploaded file is valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-200 overflow-hidden">
      {/* Sidebar Control Panel */}
      <Sidebar
        data={data}
        setData={setData}
        config={config}
        setConfig={setConfig}
        onDownloadImage={handleDownloadImage}
        onPrintPdf={handlePrintPdf}
        onMergePdf={handleMergePdf}
        isProcessing={isProcessing}
      />

      {/* Preview Area */}
      <main className="flex-1 overflow-hidden relative min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <ZoomablePreview>
            <CoverPreview ref={coverRef} data={data} config={config} />
          </ZoomablePreview>
        </div>
        {/* Copyright */}
        <div className="text-center text-xs text-gray-500 py-2 bg-gray-200 border-t border-gray-300">
          © 2025 Lab Cover Generator | Made with ❤️ by Rikka | <a href="https://github.com/NoNormalCreeper/lab-cover-generator" className="underline" target="_blank" rel="noopener noreferrer">GitHub repository</a>
        </div>
      </main>
    </div>
  );
};

export default App;
