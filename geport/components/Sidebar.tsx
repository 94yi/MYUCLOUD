import React, { useRef, useState } from 'react';
import { CoverData, SmartLineConfig } from '../types';
import { Download, FileText, Image as ImageIcon, Settings, Upload, Printer } from 'lucide-react';

interface SidebarProps {
  data: CoverData;
  setData: React.Dispatch<React.SetStateAction<CoverData>>;
  config: SmartLineConfig;
  setConfig: React.Dispatch<React.SetStateAction<SmartLineConfig>>;
  onDownloadImage: () => void;
  onPrintPdf: () => void;
  onMergePdf: (file: File) => void;
  isProcessing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  data,
  setData,
  config,
  setConfig,
  onDownloadImage,
  onPrintPdf,
  onMergePdf,
  isProcessing
}) => {
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof CoverData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (field: 'headerImage' | 'logoImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setData(prev => ({ ...prev, [field]: event.target?.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onMergePdf(file);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  return (
    <div className="w-full md:w-96 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto flex flex-col shadow-xl z-10">
      <a href="/" className="px-6 py-3 text-sm text-emerald-800 border-b border-gray-200 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2">← 返回 Snoval 学习工作台</a>
      <div className="p-6 bg-white border-b border-gray-200 sticky top-0 z-20">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          Cover Config
        </h2>
        <p className="text-xs text-gray-500 mt-1">BUPT Standard Lab Report Style</p>
      </div>

      <div className="p-6 space-y-6 flex-grow">

        {/* Section: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Student Details</h3>

          <div className="grid grid-cols-1 gap-3">
             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title (题目)</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
             </div>

             <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Class (班级)</label>
                  <input
                    type="text"
                    value={data.className}
                    onChange={(e) => handleChange('className', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID (学号)</label>
                  <input
                    type="text"
                    value={data.studentId}
                    onChange={(e) => handleChange('studentId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
               </div>
             </div>

             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name (姓名)</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
             </div>

             <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department (学院)</label>
                <input
                  type="text"
                  value={data.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
             </div>
          </div>
        </div>

        {/* Section: Date */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Date</h3>
          <div className="flex gap-2">
            <input
               type="text" placeholder="YYYY"
               value={data.dateYear}
               onChange={(e) => handleChange('dateYear', e.target.value)}
               className="w-20 p-2 border border-gray-300 rounded text-center"
            />
            <span className="self-center">/</span>
            <input
               type="text" placeholder="MM"
               value={data.dateMonth}
               onChange={(e) => handleChange('dateMonth', e.target.value)}
               className="w-16 p-2 border border-gray-300 rounded text-center"
            />
             <span className="self-center">/</span>
            <input
               type="text" placeholder="DD"
               value={data.dateDay}
               onChange={(e) => handleChange('dateDay', e.target.value)}
               className="w-16 p-2 border border-gray-300 rounded text-center"
            />
          </div>
        </div>

        {/* Section: Assets */}
        <div className="space-y-4">
           <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Assets</h3>

           <div className="flex items-center gap-4">
             <div className="flex-1">
               <label className="block text-xs font-medium text-gray-700 mb-1">Header Image</label>
               <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm">
                 <ImageIcon className="w-4 h-4 mr-2" />
                 Upload
                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('headerImage', e)} />
               </label>
             </div>

             <div className="flex-1">
               <label className="block text-xs font-medium text-gray-700 mb-1">Logo</label>
               <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm">
                 <ImageIcon className="w-4 h-4 mr-2" />
                 Upload
                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('logoImage', e)} />
               </label>
             </div>
           </div>
        </div>

        {/* Section: Layout Tweaks */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Layout Tweaks</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Underline Min Width (px)</label>
            <input
              type="range" min="100" max="300"
              value={parseInt(config.fieldMinWidth)}
              onChange={(e) => setConfig(prev => ({ ...prev, fieldMinWidth: `${e.target.value}px` }))}
              className="w-full"
            />
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3 sticky bottom-0 z-20">

        <button
            onClick={onDownloadImage}
            disabled={isProcessing}
            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Cover Image (PNG)
        </button>

        <button
            onClick={onPrintPdf}
            disabled={isProcessing}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
        >
          <Printer className="w-5 h-5 mr-2" />
          Print / Save as PDF
        </button>

        <div className="relative">
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handlePdfUpload}
            />
            <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Merge with PDF Report
                </>
              )}
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-2">
                Upload your report PDF. The cover will be inserted as Page 1.
            </p>
        </div>
      </div>
    </div>
  );
};
