/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Printer, 
  Layout, 
  Loader2, 
  ChevronRight,
  Clock,
  User,
  MapPin,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Search,
  PenTool,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateWorkbook, WorkbookData } from './services/geminiService';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const iconMap: Record<string, React.ReactNode> = {
  Clock: <Clock size={16} />,
  User: <User size={16} />,
  MapPin: <MapPin size={16} />,
  ArrowRight: <ArrowRight size={16} />,
  Info: <Info size={16} />,
  CheckCircle2: <CheckCircle2 size={16} />,
  AlertCircle: <AlertCircle size={16} />,
};

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const fillBlanks = (text: string, answer: string | undefined, show: boolean) => {
  if (!text) return "";
  if (!show || !answer) return text;
  
  // Split answers by common delimiters
  const answers = answer.split(/\s*[\/,]\s*/);
  let usedCount = 0;
  
  // Replace underscores (2 or more) with answers
  const result = text.replace(/_{2,}/g, () => {
    const ans = answers[usedCount] || answers[answers.length - 1] || "";
    usedCount++;
    return `<span class="text-rt-accent font-bold">${ans}</span>`;
  });

  // If no blanks were found, append the answer at the end
  if (usedCount === 0) {
    return `${text} <span class="text-rt-accent font-bold">${answer}</span>`;
  }
  
  return result;
};

const EditableText = ({ 
  value, 
  onChange, 
  className = "" 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  className?: string;
}) => {
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent || "")}
      className={`editable-field px-1 rounded transition-all inline-block min-w-[10px] ${className}`}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
};

export default function App() {
  const [passage, setPassage] = useState(`Hello! I am Zoops AI.
I can help you create a professional English reading workbook in seconds.
Just paste your English passage here, and I will generate vocabulary lists, comprehension questions, detailed sentence analysis, and summaries for you.

Try it now by pasting your own text!`);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorkbookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState('default');
  const [font, setFont] = useState('inter');
  const [showAnswers, setShowAnswers] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [userApiKey, setUserApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyModal, setShowKeyModal] = useState(false);

  React.useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      } else {
        setHasKey(!!userApiKey);
      }
    };
    checkKey();
  }, [userApiKey]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setShowKeyModal(true);
    }
  };

  const saveApiKey = (key: string) => {
    setUserApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowKeyModal(false);
    setHasKey(!!key);
  };

  const handleGenerate = async () => {
    if (!passage.trim()) return;
    
    // Check if key is selected.
    if (!hasKey && !userApiKey) {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } else {
        setShowKeyModal(true);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      console.log("Starting workbook generation...");
      const result = await generateWorkbook(passage, userApiKey);
      setData(result);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || '워크북 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportHtml = () => {
    if (!data) return;
    
    const workbookElement = document.querySelector('.workbook-preview');
    if (!workbookElement) return;

    // Clone the element to manipulate it for export
    const clone = workbookElement.cloneNode(true) as HTMLElement;
    
    // Remove any "no-print" elements
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    
    // Remove contenteditable and editing styles for the export
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.classList.remove('editable-field');
      el.classList.remove('px-1');
      el.classList.remove('rounded');
      el.classList.remove('transition-all');
    });
    
    // Get styles from the document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reading Tutor Workbook - ${data.summary.timeline[0]?.event || 'Export'}</title>
    ${styles}
    <style>
        body { 
            background: #f4f4f5; 
            padding: 40px 20px; 
            margin: 0;
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            gap: 40px; 
            font-family: 'Inter', sans-serif;
        }
        .workbook-preview { 
            display: flex; 
            flex-direction: column; 
            gap: 40px; 
            align-items: center; 
        }
        .print-page { 
            background: white; 
            width: 210mm; 
            min-height: 297mm; 
            padding: 20mm; 
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); 
            border: 1px solid #e5e7eb;
            position: relative;
            box-sizing: border-box;
        }
        .print-page * {
            font-size: 9pt !important;
        }
        .print-page h2, .print-page .text-xl, .print-page .text-2xl {
            font-size: 14pt !important;
        }
        .print-page .text-lg, .print-page .text-11pt {
            font-size: 11pt !important;
        }
        @media print {
            body { background: white; padding: 0; }
            .print-page { 
                box-shadow: none; 
                border: none; 
                margin: 0; 
                page-break-after: always; 
                height: auto;
            }
            .workbook-preview { gap: 0; }
        }
    </style>
</head>
<body>
    <div class="workbook-preview theme-${theme} font-${font}">
        ${clone.innerHTML}
    </div>
    <script>
        // Optional: Add a print button to the exported HTML for convenience
        const btn = document.createElement('button');
        btn.innerText = '인쇄하기 (Print)';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.padding = '12px 24px';
        btn.style.background = 'black';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = 'bold';
        btn.style.zIndex = '1000';
        btn.className = 'no-print';
        btn.onclick = () => window.print();
        document.body.appendChild(btn);
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reading_Tutor_Workbook_${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateData = (newData: Partial<WorkbookData>) => {
    if (!data) return;
    setData({ ...data, ...newData });
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-[#1a1a1a] selection:bg-zinc-200">
      {/* Modern Landing Page */}
      {!data && (
        <div className="no-print min-h-screen flex flex-col">
          {/* Navigation */}
          <nav className="flex items-center justify-between px-8 py-6 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-xl">Z</div>
              <span className="font-bold text-xl tracking-tighter">Zoops AI</span>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={handleSelectKey}
                className={`text-sm font-semibold transition-colors ${hasKey ? 'text-emerald-600 hover:text-emerald-700' : 'text-zinc-500 hover:text-black'}`}
              >
                {hasKey ? 'API Key 설정됨' : 'API Key 설정'}
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-sm font-semibold text-zinc-500 hover:text-black transition-colors">
                Billing Info
              </a>
            </div>
          </nav>

          <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side: Hero & Controls */}
            <div className="p-8 lg:p-16 flex flex-col justify-center border-r border-zinc-100">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-xl"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  AI-Powered Reading Workbook
                </div>
                <h1 className="text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] mb-8">
                  Create <span className="text-zinc-400 italic">Reading</span> Workbooks in Seconds.
                </h1>
                <p className="text-xl text-zinc-500 font-medium leading-relaxed mb-12">
                  지문을 입력하면 줍스 AI가 어휘 리스트, 독해 문제, 구문 분석, 시각적 요약까지 포함된 전문적인 워크북을 즉시 생성합니다.
                </p>

                <div className="space-y-8">
                  {/* Theme Selector */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Color Theme</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'default', color: 'bg-black' },
                        { id: 'indigo', color: 'bg-indigo-600' },
                        { id: 'emerald', color: 'bg-emerald-600' },
                        { id: 'rose', color: 'bg-rose-600' },
                        { id: 'amber', color: 'bg-amber-600' },
                        { id: 'violet', color: 'bg-violet-600' },
                        { id: 'slate', color: 'bg-slate-600' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            theme === t.id ? 'ring-2 ring-offset-2 ring-black scale-110' : 'hover:scale-105'
                          } ${t.color}`}
                        >
                          {theme === t.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Selector */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Typography</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'inter', name: 'Inter', class: 'font-sans' },
                        { id: 'space', name: 'Space', class: 'font-space' },
                        { id: 'playfair', name: 'Playfair', class: 'font-playfair' },
                        { id: 'jetbrains', name: 'Mono', class: 'font-jetbrains' },
                        { id: 'montserrat', name: 'Montserrat', class: 'font-montserrat' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFont(f.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
                            font === f.id 
                              ? 'bg-black text-white border-black shadow-lg scale-105' 
                              : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                          } ${f.class}`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleGenerate}
                      disabled={loading || !passage.trim()}
                      className="group relative w-full lg:w-auto px-12 py-5 bg-black text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-zinc-800 disabled:bg-zinc-200 transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
                    >
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="animate-spin" />
                          <span>Generating...</span>
                        </div>
                      ) : (
                        <>
                          <span>워크북 생성하기</span>
                          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    {loading && (
                      <p className="mt-4 text-sm text-zinc-400 font-medium animate-pulse">
                        지문 분석 중입니다. 약 1분 정도 소요될 수 있습니다...
                      </p>
                    )}
                    {error && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold">
                        <AlertCircle size={18} />
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Side: Editor */}
            <div className="bg-zinc-50 p-8 lg:p-16 flex flex-col">
              <div className="flex-1 bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Passage Editor</span>
                </div>
                <textarea
                  className="flex-1 w-full p-8 focus:outline-none resize-none font-serif text-xl leading-relaxed text-zinc-800 placeholder:text-zinc-300"
                  placeholder="여기에 영어 지문을 붙여넣으세요..."
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                />
              </div>
              <p className="mt-6 text-center text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">
                Paste your text above to begin the transformation
              </p>
            </div>
          </main>

          <footer className="px-8 py-6 border-t border-zinc-100 flex justify-between items-center text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em]">
            <span>© 2026 Zoops AI</span>
            <span>Powered by Gemini 3 Flash</span>
          </footer>
        </div>
      )}

      {/* Workbook Content */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-100"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-xl tracking-tight">API Key 설정</h3>
                  <p className="text-sm text-zinc-500">Gemini API 키를 입력해주세요.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">API Key</label>
                  <input 
                    type="password"
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                  />
                </div>
                
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    API 키가 없으신가요? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-black font-bold underline">Google AI Studio</a>에서 무료로 발급받으실 수 있습니다.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setShowKeyModal(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
                  >
                    취소
                  </button>
                  <button 
                    onClick={() => saveApiKey(userApiKey)}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {data && (
          <div className={`workbook-preview theme-${theme} font-${font}`}>
            {/* Page 1: Vocabulary */}
            <div className="print-page">
              <div className="rt-header">
                <span className="font-bold">Reading Workbook Zoops AI <span className="rt-title-dot"></span></span>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-2">
                   <div className="bg-rt-accent text-white p-1 rounded"><BookOpen size={14} /></div>
                   <span className="font-bold text-lg">Voca</span>
                </div>
              </div>

              <div className="border border-rt-accent">
                <div className="flex items-center gap-2 text-[8pt] font-bold border-b border-rt-accent px-2 py-1">
                  <ChevronRight size={12} /> Find and write down & overwrite
                </div>
                
                <div className="grid grid-cols-2">
                  {/* Left Column: Vocabulary Search */}
                  <div className="border-r border-rt-accent">
                    <div className="bg-rt-bg border-b border-rt-accent px-2 py-1 font-bold text-[8pt]">
                      교재에서 단어를 찾아 쓰세요
                    </div>
                    <table className="w-full text-[8pt]">
                      <tbody>
                        {Array.from({ length: 15 }).map((_, idx) => {
                          const item = data.vocabulary[idx];
                          return (
                            <tr key={idx} className="border-b border-zinc-200">
                              <td className="w-1/2 border-r border-zinc-200 h-7 pl-2 font-medium text-rt-accent">
                                {showAnswers ? item?.word : ""}
                              </td>
                              <td className="w-1/2 pl-2">
                                <EditableText value={item?.meaning || ""} onChange={(v) => {
                                  const newList = [...data.vocabulary];
                                  if (newList[idx]) newList[idx].meaning = v;
                                  updateData({ vocabulary: newList });
                                }} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Phrases & Matching */}
                  <div>
                    <div className="grid grid-cols-2 bg-rt-bg border-b border-rt-accent">
                       <div className="px-2 py-1 font-bold text-[8pt] border-r border-zinc-300">그의 돌아오는 길</div>
                       <div className={`px-2 py-1 font-bold text-[8pt] italic ${showAnswers ? 'text-rt-accent' : 'text-zinc-300'}`}>his way back</div>
                    </div>
                    
                    <div className="h-[112px]"> {/* Space for top phrases */}
                      <table className="w-full text-[8pt]">
                        <tbody>
                          {data.phrases.slice(0, 4).map((item, idx) => (
                            <tr key={idx} className="border-b border-zinc-200">
                              <td className="w-1/2 border-r border-zinc-200 h-7 pl-2">{item.korean}</td>
                              <td className={`w-1/2 pl-2 italic ${showAnswers ? 'text-rt-accent font-bold' : 'text-zinc-300'}`}>{item.english}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-rt-bg border-y border-rt-accent px-2 py-1 font-bold text-[8pt]">
                      뜻에 맞는 단어를 덮어쓴 단어에서 찾아 쓰세요
                    </div>

                    <table className="w-full text-[8pt]">
                      <tbody>
                        {Array.from({ length: 10 }).map((_, idx) => {
                          const item = data.vocabulary[idx + 5]; // Offset to show different words
                          return (
                            <tr key={idx} className="border-b border-zinc-200">
                              <td className="w-1/2 border-r border-zinc-200 h-7 pl-2 font-medium text-rt-accent">
                                {showAnswers ? item?.word : ""}
                              </td>
                              <td className={`w-1/2 pl-2 italic ${showAnswers ? 'text-rt-accent font-bold' : 'text-zinc-300'}`}>
                                {item?.word || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Bottom Left: Overwrite Words */}
                <div className="border border-rt-accent">
                  <div className="bg-rt-bg border-b border-rt-accent px-2 py-1 font-bold text-[8pt]">
                    영어 단어를 덮어쓰세요
                  </div>
                  <table className="w-full text-[8pt]">
                    <tbody>
                      {data.vocabulary.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-200">
                          <td className="w-1/2 border-r border-zinc-200 h-7 pl-2">{item.meaning}</td>
                          <td className={`w-1/2 pl-2 italic ${showAnswers ? 'text-rt-accent font-bold' : 'text-zinc-300'}`}>{item.word}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Right: Titles/Summaries */}
                <div className="border border-rt-accent">
                  <div className="bg-rt-bg border-b border-rt-accent px-2 py-1 font-bold text-[8pt]">
                    아리아드네 공주가 고대 미스터리를 풀었던 방법
                  </div>
                  <table className="w-full text-[8pt]">
                    <tbody>
                      {data.titles.map((item, idx) => (
                        <tr key={idx} className="border-b border-zinc-200">
                          <td className="h-10 py-1 px-2">
                            <div className="text-[7pt] font-bold text-zinc-600 mb-0.5">{item.korean}</div>
                            <div className={`text-[8pt] italic leading-tight ${showAnswers ? 'text-rt-accent font-bold' : 'text-zinc-300'}`}>{item.english}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Page 2: 부분 해석 (Supports multiple pages) */}
            {chunkArray(data.detailedStudy, 15).map((chunk: WorkbookData['detailedStudy'], pageIdx) => (
              <div key={`page-detailed-${pageIdx}`} className="print-page">
                <div className="rt-header">
                  <span className="font-bold">Reading Workbook Zoops AI <span className="rt-title-dot"></span></span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Search size={18} className="text-rt-accent" />
                  <h2 className="font-bold text-lg">부분 해석 {pageIdx + 1}</h2>
                </div>

                <div className="space-y-8">
                  {chunk.map((item, idx) => {
                    const globalIdx = pageIdx * 15 + idx;
                    const circledNumber = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮"][globalIdx] || (globalIdx + 1).toString();
                    
                    return (
                      <div key={globalIdx} className="relative group">
                        {/* Decorative triangle for first few items like in reference */}
                        {globalIdx === 0 && (
                          <div className="absolute -right-4 -top-4 opacity-20 rotate-12 no-print">
                            <AlertCircle size={48} className="text-rt-accent" />
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <span className="text-lg font-bold text-rt-accent mt-0.5 flex-shrink-0">
                            {circledNumber}
                          </span>
                          
                          <div className="flex-1 space-y-2">
                            {/* English Sentence with Slashes */}
                            <p className="font-serif text-[11.5pt] leading-relaxed tracking-tight text-zinc-800">
                              <EditableText value={item.slashedEnglish} onChange={(v) => {
                                const newList = [...data.detailedStudy];
                                newList[globalIdx].slashedEnglish = v;
                                updateData({ detailedStudy: newList });
                              }} />
                            </p>
                            
                            {/* Syntax Question (Optional but encouraged) */}
                            {item.syntaxQuestion && (
                              <div className="text-[9pt] text-zinc-500 italic pl-2 border-l-2 border-zinc-100">
                                 <EditableText 
                                   value={showAnswers ? `정답: ${item.syntaxAnswer}` : item.syntaxQuestion} 
                                   onChange={(v) => {
                                     const newList = [...data.detailedStudy];
                                     if (showAnswers) {
                                       newList[globalIdx].syntaxAnswer = v.replace('정답: ', '');
                                     } else {
                                       newList[globalIdx].syntaxQuestion = v;
                                     }
                                     updateData({ detailedStudy: newList });
                                   }} 
                                 />
                              </div>
                            )}

                            {/* Korean Translation with Blanks */}
                            <div className="text-zinc-600 text-[10pt] font-medium leading-loose pl-2">
                              <EditableText 
                                value={fillBlanks(item.slashedKorean, item.koreanAnswers, showAnswers)} 
                                onChange={(v) => {
                                  const newList = [...data.detailedStudy];
                                  if (showAnswers) {
                                    newList[globalIdx].koreanAnswers = v;
                                  } else {
                                    newList[globalIdx].slashedKorean = v;
                                  }
                                  updateData({ detailedStudy: newList });
                                }} 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Page 3: Reading Comprehension Quiz */}
            <div className="print-page">
              <div className="rt-header">
                <span className="font-bold">Reading Workbook Zoops AI <span className="rt-title-dot"></span></span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <HelpCircle size={18} />
                <h2 className="font-bold text-lg">Reading Comprehension Quiz</h2>
              </div>

              <div className="space-y-6">
                {data.questions.map((q, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="font-medium flex gap-2 text-[11pt]">
                      <span className="flex-shrink-0">{idx + 1}.</span>
                      <EditableText value={q.question} onChange={(v) => {
                        const newList = [...data.questions];
                        newList[idx].question = v;
                        updateData({ questions: newList });
                      }} />
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 pl-6">
                      {Object.entries(q.options).map(([key, opt]) => (
                        <div key={key} className="flex items-start gap-3">
                          <span className={`text-zinc-600 min-w-[20px] ${showAnswers && q.answer.toLowerCase() === key ? 'text-rt-accent font-bold' : ''}`}>{key})</span>
                          <div className="flex-1">
                            <EditableText 
                              className={`text-[10pt] ${showAnswers && q.answer.toLowerCase() === key ? 'text-rt-accent font-bold bg-rt-bg px-1 rounded' : ''}`} 
                              value={opt as string} 
                              onChange={(v) => {
                                const newList = [...data.questions];
                                newList[idx].options = { ...newList[idx].options, [key]: v };
                                updateData({ questions: newList });
                              }} 
                            />
                            {showAnswers && q.answer.toLowerCase() === key && (
                              <span className="ml-2 text-[8pt] text-rt-accent font-bold no-print">(Correct Answer)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes Section at the bottom */}
              <div className="absolute bottom-10 left-10 right-10 border-t border-zinc-100 pt-4">
                <div className="flex flex-col items-end gap-1 text-[8pt] text-zinc-500 italic">
                  {data.questions.map((q, idx) => q.note && (
                    <div key={idx} className="flex items-center gap-2">
                       <span>•</span>
                       <EditableText value={q.note} onChange={(v) => {
                         const newList = [...data.questions];
                         newList[idx].note = v;
                         updateData({ questions: newList });
                       }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Page 4: 요약, 요약쓰기, 빈칸채우기, 핵심요약 */}
            <div className="print-page">
              <div className="rt-header">
                <span className="font-bold">Reading Workbook Zoops AI <span className="rt-title-dot"></span></span>
              </div>

              <div className="space-y-4">
                {/* 1. English Summary with Blanks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={18} className="text-rt-accent" />
                      <h2 className="font-bold text-lg">요약</h2>
                    </div>
                    <div className="text-[9pt] text-zinc-600 font-medium tracking-tight">
                      {data.summary.englishWords.join(" | ")}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                    <p className="font-serif leading-relaxed text-[10.5pt] text-zinc-800">
                      <EditableText 
                        value={showAnswers ? data.summary.fullEnglish : data.summary.englishWithBlanks} 
                        onChange={(v) => updateData({ summary: { ...data.summary, [showAnswers ? 'fullEnglish' : 'englishWithBlanks']: v } })} 
                      />
                    </p>
                  </div>
                </div>

                {/* 2. Write Summary Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PenTool size={16} className="text-rt-accent" />
                    <h3 className="font-bold text-[11pt]">요약쓰기</h3>
                  </div>
                  <div className="space-y-3 px-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="border-b border-dotted border-zinc-300 h-6"></div>
                    ))}
                  </div>
                </div>

                {/* 3. Fill in the Blank (Korean) */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-rt-accent" />
                    <h3 className="font-bold text-[11pt]">빈칸채우기</h3>
                  </div>
                  <div className="px-2">
                    <p className="leading-loose text-[10pt] text-zinc-700">
                      <EditableText 
                        value={showAnswers ? data.summary.fullKorean : data.summary.koreanWithBlanks} 
                        onChange={(v) => updateData({ summary: { ...data.summary, [showAnswers ? 'fullKorean' : 'koreanWithBlanks']: v } })} 
                      />
                    </p>
                  </div>
                </div>

                {/* 4. A brief summary section */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <PenTool size={16} className="text-rt-accent" />
                    <h3 className="font-bold text-[11pt]">핵심요약</h3>
                  </div>
                  <div className="border-t border-zinc-200 mt-2"></div>
                </div>

                {/* 5. Visual Story Map */}
                <div className="pt-6">
                   <h3 className="text-center font-black text-lg mb-12 italic tracking-tight">Visual Story Map</h3>
                   <div className="relative flex justify-between items-center px-8 h-32">
                     {/* Main horizontal line with arrow */}
                     <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rt-accent -translate-y-1/2">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-rt-accent"></div>
                     </div>
                     
                     {data.summary.timeline.map((item, idx) => {
                       const isEven = idx % 2 === 0;
                       return (
                         <div key={idx} className="relative flex flex-col items-center w-24">
                           {/* Vertical connector line */}
                           <div className={`absolute w-px bg-zinc-300 h-10 ${isEven ? 'bottom-1/2' : 'top-1/2'}`}></div>
                           
                           {/* Content above the line */}
                           {isEven && (
                             <div className="absolute bottom-12 w-32 text-center flex flex-col items-center">
                               <div className="text-[7.5pt] font-bold leading-tight mb-2 h-8 flex items-end justify-center">
                                 <EditableText value={item.event} onChange={(v) => {
                                   const newTimeline = [...data.summary.timeline];
                                   newTimeline[idx].event = v;
                                   updateData({ summary: { ...data.summary, timeline: newTimeline } });
                                 }} />
                               </div>
                               <div className="w-10 h-10 bg-white border-2 border-rt-accent rounded-lg flex items-center justify-center shadow-sm mb-1">
                                 {iconMap[item.icon] || <ChevronRight size={16} />}
                               </div>
                             </div>
                           )}

                           {/* Node on the line */}
                           <div className="w-3.5 h-3.5 bg-white border-2 border-rt-accent rounded-full relative z-10"></div>

                           {/* Content below the line */}
                           {!isEven && (
                             <div className="absolute top-12 w-32 text-center flex flex-col items-center">
                               <div className="w-10 h-10 bg-white border-2 border-rt-accent rounded-lg flex items-center justify-center shadow-sm mb-2">
                                 {iconMap[item.icon] || <ChevronRight size={16} />}
                               </div>
                               <div className="text-[7.5pt] font-bold leading-tight mb-1">
                                 <EditableText value={item.event} onChange={(v) => {
                                   const newTimeline = [...data.summary.timeline];
                                   newTimeline[idx].event = v;
                                   updateData({ summary: { ...data.summary, timeline: newTimeline } });
                                 }} />
                               </div>
                               <div className="text-[6.5pt] text-zinc-500 leading-tight italic max-w-[100px]">
                                 <EditableText value={item.subtext} onChange={(v) => {
                                   const newTimeline = [...data.summary.timeline];
                                   newTimeline[idx].subtext = v;
                                   updateData({ summary: { ...data.summary, timeline: newTimeline } });
                                 }} />
                               </div>
                             </div>
                           )}

                           {/* Subtext for even nodes (below the line) */}
                           {isEven && (
                             <div className="absolute top-6 w-32 text-center">
                               <div className="text-[6.5pt] text-zinc-500 leading-tight italic max-w-[100px] mx-auto">
                                 <EditableText value={item.subtext} onChange={(v) => {
                                   const newTimeline = [...data.summary.timeline];
                                   newTimeline[idx].subtext = v;
                                   updateData({ summary: { ...data.summary, timeline: newTimeline } });
                                 }} />
                               </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                   </div>
                </div>
              </div>

              <div className="absolute bottom-8 left-10 right-10 flex justify-between text-[8pt] text-zinc-300 border-t border-zinc-100 pt-4">
                <span>Reading Workbook Zoops AI</span>
                <span>Created by Zoops</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {data && (
        <div className="no-print fixed bottom-8 right-8 flex flex-col gap-4 items-end">
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 group flex items-center gap-2 px-6 ${
              showAnswers ? 'bg-rt-accent text-white' : 'bg-white text-zinc-800 border border-zinc-200'
            }`}
            title={showAnswers ? "Hide Answers" : "Show Answers"}
          >
            {showAnswers ? <CheckCircle2 size={24} /> : <HelpCircle size={24} />}
            <span className="font-bold">{showAnswers ? "정답 숨기기" : "정답 보기"}</span>
          </button>

          <button
            onClick={handleExportHtml}
            className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 group flex items-center gap-2 px-6"
            title="Export as HTML"
          >
            <Layout size={24} />
            <span className="font-bold">HTML 내보내기</span>
          </button>
          
          <button
            onClick={() => setData(null)}
            className="bg-zinc-100 text-zinc-500 p-4 rounded-full shadow-lg hover:scale-110 transition-all active:scale-95 group flex items-center gap-2 px-6"
          >
            <ArrowRight className="rotate-180" size={20} />
            <span className="font-bold">새 지문 입력</span>
          </button>
        </div>
      )}
    </div>
  );
}
