import React, { useState } from 'react';
import { Languages, ExternalLink, ArrowRightLeft, Copy, Check } from 'lucide-react';

const QuickTranslator: React.FC = () => {
  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('vi');
  const [copied, setCopied] = useState(false);

  const handleTranslate = () => {
      if (!text.trim()) return;
      // Construct Google Translate URL
      const url = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
      window.open(url, '_blank');
  };

  const handleSwap = () => {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900 p-8 overflow-y-auto">
       <div className="max-w-3xl mx-auto w-full">
           <div className="mb-8 text-center">
               <div className="bg-blue-100 dark:bg-blue-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                   <Languages size={32} />
               </div>
               <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Dịch thuật nhanh</h1>
               <p className="text-gray-500 dark:text-slate-400">Công cụ hỗ trợ dịch thuật nhanh chóng qua Google Translate</p>
           </div>

           <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
               {/* Controls */}
               <div className="bg-gray-50 dark:bg-slate-950/50 p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                       <select 
                        value={sourceLang} 
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                       >
                           <option value="auto">Phát hiện ngôn ngữ</option>
                           <option value="en">Tiếng Anh</option>
                           <option value="vi">Tiếng Việt</option>
                           <option value="fr">Tiếng Pháp</option>
                           <option value="ja">Tiếng Nhật</option>
                           <option value="ko">Tiếng Hàn</option>
                           <option value="zh-CN">Tiếng Trung</option>
                       </select>
                       
                       <button onClick={handleSwap} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition text-gray-500">
                           <ArrowRightLeft size={16} />
                       </button>

                       <select 
                        value={targetLang} 
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                       >
                           <option value="vi">Tiếng Việt</option>
                           <option value="en">Tiếng Anh</option>
                           <option value="fr">Tiếng Pháp</option>
                           <option value="ja">Tiếng Nhật</option>
                           <option value="ko">Tiếng Hàn</option>
                       </select>
                   </div>
                   
                   <button onClick={handleCopy} className="text-gray-400 hover:text-blue-500 transition" title="Copy text">
                       {copied ? <Check size={18} className="text-green-500"/> : <Copy size={18} />}
                   </button>
               </div>

               {/* Text Area */}
               <div className="p-6">
                   <textarea
                       value={text}
                       onChange={(e) => setText(e.target.value)}
                       className="w-full h-48 bg-transparent outline-none resize-none text-lg text-gray-800 dark:text-white placeholder-gray-300 dark:placeholder-slate-600"
                       placeholder="Nhập văn bản cần dịch tại đây..."
                   />
               </div>

               {/* Action Footer */}
               <div className="p-4 bg-gray-50 dark:bg-slate-950/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                   <button 
                    onClick={handleTranslate}
                    disabled={!text.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 dark:shadow-none"
                   >
                       Dịch ngay <ExternalLink size={18} />
                   </button>
               </div>
           </div>

           <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                   <h3 className="font-bold text-gray-800 dark:text-white mb-2">Mẹo học từ vựng</h3>
                   <p className="text-sm text-gray-500 dark:text-slate-400">
                       Hãy thử copy một đoạn văn bản tiếng Anh vào đây, dịch sang tiếng Việt để hiểu nghĩa, sau đó tự viết lại bằng tiếng Anh và so sánh với bản gốc.
                   </p>
               </div>
               <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                   <h3 className="font-bold text-gray-800 dark:text-white mb-2">Không cần API Key</h3>
                   <p className="text-sm text-gray-500 dark:text-slate-400">
                       Công cụ này chuyển hướng trực tiếp đến Google Translate, giúp bạn dịch văn bản dài mà không lo giới hạn ký tự hay chi phí API.
                   </p>
               </div>
           </div>
       </div>
    </div>
  );
};

export default QuickTranslator;