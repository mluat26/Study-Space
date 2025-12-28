import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, RotateCcw, RotateCw, Type, Palette, ChevronDown, ChevronUp, Sparkles, Image as ImageIcon, FileUp, MoreHorizontal, Trash, Maximize2, Minimize2, Settings, HelpCircle, Keyboard, X, Link as LinkIcon, Download } from 'lucide-react';
import * as mammoth from "https://esm.sh/mammoth@1.6.0";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174";

// Handle inconsistent ESM export structure for pdfjs-dist
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Worker config for PDF.js
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

export interface RichTextEditorRef {
    insertContent: (html: string) => void;
    getContent: () => string;
    getPlainText: () => string;
    setSummary: (html: string) => void;
}

interface RichTextEditorProps {
    initialContent: string;
    onChange: (content: string) => void;
    placeholder?: string;
    onSave?: () => void;
    onOpenAISidebar?: () => void;
}

// A4 Height approx 1123px at 96DPI. We use a pattern height slightly smaller for screen viewing comfort.
const PAGE_HEIGHT_PX = 1123; 

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ initialContent, onChange, placeholder, onSave, onOpenAISidebar }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [fontName, setFontName] = useState('Inter');
    const [summary, setSummary] = useState('');
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true); // New state for collapsing
    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    
    // Stats
    const [stats, setStats] = useState({ words: 0, currentPage: 1, totalPages: 1 });

    // Image Editing State
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [imgToolbarPos, setImgToolbarPos] = useState({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
        insertContent: (html: string) => {
            if (editorRef.current) {
                editorRef.current.focus();
                document.execCommand('insertHTML', false, html);
                handleChange();
            }
        },
        getContent: () => {
            const editorContent = editorRef.current ? editorRef.current.innerHTML : '';
            if (summary && summary.trim().length > 0) {
                return `<div class="ai-summary-content" style="display:none">${summary}</div>${editorContent}`;
            }
            return editorContent;
        },
        getPlainText: () => {
            return editorRef.current ? editorRef.current.innerText : '';
        },
        setSummary: (html: string) => {
            setSummary(html);
            setIsSummaryExpanded(true); // Auto expand when new summary arrives
        }
    }));

    useEffect(() => {
        if (initialContent) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(initialContent, 'text/html');
            const summaryDiv = doc.querySelector('.ai-summary-content');
            const legacySummaryDiv = doc.querySelector('.smartstudy-ai-summary');
            const targetDiv = summaryDiv || legacySummaryDiv;

            if (targetDiv) {
                setSummary(targetDiv.innerHTML);
                targetDiv.remove(); 
                if(editorRef.current) editorRef.current.innerHTML = doc.body.innerHTML;
            } else {
                setSummary('');
                if(editorRef.current) editorRef.current.innerHTML = initialContent;
            }
        } else {
            setSummary('');
            if(editorRef.current) editorRef.current.innerHTML = '';
        }
        updateStats();
    }, []); 

    // Handle clicks inside editor to detect image selection and update stats
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            updateStats(); // Update stats on click

            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG' && editorRef.current?.contains(target)) {
                const img = target as HTMLImageElement;
                setSelectedImage(img);
                
                // Calculate position relative to the image
                const rect = img.getBoundingClientRect();
                const editorRect = editorRef.current.getBoundingClientRect();
                
                // Position toolbar above the image
                setImgToolbarPos({
                    x: rect.left - editorRect.left + (rect.width / 2) - 100, // Center horizontally relative to editor
                    y: img.offsetTop - 50 // Above image
                });
            } else {
                setSelectedImage(null);
            }
        };

        const currentEditor = editorRef.current;
        if (currentEditor) {
            currentEditor.addEventListener('click', handleClick);
            currentEditor.addEventListener('keyup', updateStats); // Update stats on keyup
        }

        return () => {
            if (currentEditor) {
                currentEditor.removeEventListener('click', handleClick);
                currentEditor.removeEventListener('keyup', updateStats);
            }
        }
    }, []);

    const updateStats = () => {
        if (!editorRef.current) return;

        // Word Count
        const text = editorRef.current.innerText || '';
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

        // Page Calculation
        // 1. Calculate Total Pages based on height
        const scrollHeight = editorRef.current.scrollHeight;
        const totalPages = Math.max(1, Math.ceil(scrollHeight / PAGE_HEIGHT_PX));

        // 2. Calculate Current Page based on cursor position
        let currentPage = 1;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
            try {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const editorRect = editorRef.current.getBoundingClientRect();
                
                // Calculate relative Y position of the cursor inside the editor content
                // We add scrollTop because getBoundingClientRect is relative to viewport
                const relativeY = rect.top - editorRect.top + editorRef.current.scrollTop;
                
                currentPage = Math.max(1, Math.ceil(relativeY / PAGE_HEIGHT_PX));
            } catch (e) {
                // Fallback if range calculation fails
            }
        }

        setStats({ words: wordCount, currentPage, totalPages });
    };

    const handleChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
            updateStats();
        }
    };

    const exec = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        handleChange();
    };

    const insertLink = () => {
        const url = prompt("Nhập đường dẫn (URL):", "https://");
        if(url) {
            document.execCommand("createLink", false, url);
            handleChange();
        }
    };

    // --- Keyboard Event Handlers ---
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Handle Save Shortcut (Ctrl + S)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if(onSave) onSave();
            return;
        }

        // Handle Tab indentation
        if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    };

    // --- Markdown Shortcuts Logic ---
    const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Handle Markdown Shortcuts on SPACE
        if (e.key === ' ') {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            const node = range.startContainer;

            // We only care if we are inside a text node
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                const text = node.textContent;
                const caretPos = range.startOffset;
                
                // Get text up to caret and normalize non-breaking spaces
                const textBeforeCaret = text.substring(0, caretPos).replace(/\u00A0/g, ' '); 
                
                // Patterns to look for (Must match exact start of line pattern)
                const patterns: Record<string, { cmd: string, val?: string }> = {
                    '# ': { cmd: 'formatBlock', val: 'H1' },
                    '## ': { cmd: 'formatBlock', val: 'H2' },
                    '### ': { cmd: 'formatBlock', val: 'H3' },
                    '* ': { cmd: 'insertUnorderedList' },
                    '- ': { cmd: 'insertUnorderedList' },
                    '1. ': { cmd: 'insertOrderedList' },
                    '> ': { cmd: 'formatBlock', val: 'BLOCKQUOTE' },
                    '``` ': { cmd: 'formatBlock', val: 'PRE' }, // Code block
                };

                // Check if text matches pattern exactly (indicating start of line)
                const matchedPattern = Object.keys(patterns).find(p => textBeforeCaret === p);

                if (matchedPattern) {
                    const pattern = patterns[matchedPattern];
                    
                    // 1. Remove the trigger characters (e.g. "# ")
                    const newRange = document.createRange();
                    newRange.setStart(node, 0);
                    newRange.setEnd(node, caretPos);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    document.execCommand('delete');

                    // 2. Execute Format
                    document.execCommand(pattern.cmd, false, pattern.val || '');
                    
                    handleChange();
                }
            }
        }
        updateStats();
    };

    // --- Image Compression & Insertion ---
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000;
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width;
                    const height = (img.width > MAX_WIDTH) ? img.height * scaleSize : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.7 quality
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                }
            }
        });
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImage(file);
                // Insert image
                if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertImage', false, compressedDataUrl);
                    // Add some default styling to prevent massive overflow immediately
                    const imgs = editorRef.current.getElementsByTagName('img');
                    const lastImg = imgs[imgs.length - 1];
                    if (lastImg) {
                        lastImg.style.maxWidth = '100%';
                        lastImg.style.borderRadius = '8px';
                        lastImg.style.boxShadow = '0 4px 6px -1px rgb(0 0 0 / 0.1)';
                    }
                    handleChange();
                }
            } catch (err) {
                console.error("Image upload failed", err);
                alert("Lỗi khi tải ảnh.");
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Image Resize Actions ---
    const resizeImage = (size: 'small' | 'medium' | 'large' | 'auto') => {
        if (!selectedImage) return;
        
        if (size === 'small') selectedImage.style.width = '25%';
        else if (size === 'medium') selectedImage.style.width = '50%';
        else if (size === 'large') selectedImage.style.width = '75%';
        else selectedImage.style.width = '100%';
        
        selectedImage.style.height = 'auto';
        handleChange();
        setSelectedImage(null); // Close toolbar
    };

    const removeImage = () => {
        if(selectedImage) {
            selectedImage.remove();
            handleChange();
            setSelectedImage(null);
        }
    };

    const downloadImage = () => {
        if(selectedImage) {
            const a = document.createElement('a');
            a.href = selectedImage.src;
            a.download = `image-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    // --- Doc Import (PDF/Word) ---
    const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += `<p><strong>Page ${i}:</strong> ${pageText}</p>`;
                }
                
                if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertHTML', false, `<hr/><h3>Imported PDF: ${file.name}</h3>${fullText}<hr/>`);
                    handleChange();
                }

            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                
                if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertHTML', false, `<hr/><h3>Imported Doc: ${file.name}</h3>${result.value}<hr/>`);
                    handleChange();
                }
            } else {
                alert("Định dạng file không được hỗ trợ (chỉ hỗ trợ PDF và Docx)");
            }
        } catch (err) {
            console.error("Import error", err);
            alert("Lỗi khi đọc file. Vui lòng thử file khác.");
        }

        if (docInputRef.current) docInputRef.current.value = '';
    }

    const fonts = [
        { name: 'Sans Serif', value: 'Inter, sans-serif' },
        { name: 'Serif', value: 'Merriweather, serif' },
        { name: 'Monospace', value: 'Fira Code, monospace' },
        { name: 'Cursive', value: 'Comic Sans MS, cursive' },
    ];

    const shortcuts = [
        { key: '# + Space', desc: 'Heading 1' },
        { key: '## + Space', desc: 'Heading 2' },
        { key: '### + Space', desc: 'Heading 3' },
        { key: '* + Space', desc: 'Danh sách chấm' },
        { key: '- + Space', desc: 'Danh sách chấm' },
        { key: '1. + Space', desc: 'Danh sách số' },
        { key: '> + Space', desc: 'Trích dẫn' },
        { key: '``` + Space', desc: 'Khung Code' },
        { key: 'Ctrl + B/I/U', desc: 'Đậm/Nghiêng/Gạch' },
        { key: 'Tab', desc: 'Thụt đầu dòng' },
    ];

    // SVG for Light Mode Page Break - Using encodeURIComponent and percentage coordinates for robustness
    const svgLight = `
<svg width='100%' height='${PAGE_HEIGHT_PX}' xmlns='http://www.w3.org/2000/svg'>
  <defs>
    <pattern id='p-light' x='0' y='0' width='100%' height='${PAGE_HEIGHT_PX}' patternUnits='userSpaceOnUse'>
      <rect x='0' y='0' width='100%' height='${PAGE_HEIGHT_PX - 40}' fill='white' />
      <rect x='0' y='${PAGE_HEIGHT_PX - 40}' width='100%' height='40' fill='%23f1f5f9' />
      <line x1='2%' y1='${PAGE_HEIGHT_PX - 20}' x2='40%' y2='${PAGE_HEIGHT_PX - 20}' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='6 4' />
      <text x='50%' y='${PAGE_HEIGHT_PX - 15}' font-family='sans-serif' font-size='12' font-weight='bold' fill='%2394a3b8' text-anchor='middle'>Page break</text>
      <line x1='60%' y1='${PAGE_HEIGHT_PX - 20}' x2='98%' y2='${PAGE_HEIGHT_PX - 20}' stroke='%23cbd5e1' stroke-width='2' stroke-dasharray='6 4' />
    </pattern>
  </defs>
  <rect x='0' y='0' width='100%' height='100%' fill='url(%23p-light)' />
</svg>
`.trim().replace(/\n/g, '');

    // SVG for Dark Mode Page Break
    const svgDark = `
<svg width='100%' height='${PAGE_HEIGHT_PX}' xmlns='http://www.w3.org/2000/svg'>
  <defs>
    <pattern id='p-dark' x='0' y='0' width='100%' height='${PAGE_HEIGHT_PX}' patternUnits='userSpaceOnUse'>
      <rect x='0' y='0' width='100%' height='${PAGE_HEIGHT_PX - 40}' fill='%231e293b' />
      <rect x='0' y='${PAGE_HEIGHT_PX - 40}' width='100%' height='40' fill='%230f172a' />
      <line x1='2%' y1='${PAGE_HEIGHT_PX - 20}' x2='40%' y2='${PAGE_HEIGHT_PX - 20}' stroke='%23334155' stroke-width='2' stroke-dasharray='6 4' />
      <text x='50%' y='${PAGE_HEIGHT_PX - 15}' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23475569' text-anchor='middle'>Page break</text>
      <line x1='60%' y1='${PAGE_HEIGHT_PX - 20}' x2='98%' y2='${PAGE_HEIGHT_PX - 20}' stroke='%23334155' stroke-width='2' stroke-dasharray='6 4' />
    </pattern>
  </defs>
  <rect x='0' y='0' width='100%' height='100%' fill='url(%23p-dark)' />
</svg>
`.trim().replace(/\n/g, '');

    // Safely encode SVG for data URI
    const svgLightUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgLight)}`;
    const svgDarkUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgDark)}`;

    return (
        <div className="flex flex-col h-full border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-colors relative group w-full">
            
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex-wrap shrink-0">
                
                {/* History */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => exec('undo')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-500" title="Hoàn tác"><RotateCcw size={16}/></button>
                    <button onClick={() => exec('redo')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-500" title="Làm lại"><RotateCw size={16}/></button>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                {/* Basic Formatting */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => exec('bold')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-bold" title="In đậm"><Bold size={16}/></button>
                    <button onClick={() => exec('italic')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 italic" title="In nghiêng"><Italic size={16}/></button>
                    <button onClick={() => exec('underline')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 underline" title="Gạch chân"><Underline size={16}/></button>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400" title="Căn trái"><AlignLeft size={16}/></button>
                    <button onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400" title="Căn giữa"><AlignCenter size={16}/></button>
                    <button onClick={() => exec('justifyRight')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400" title="Căn phải"><AlignRight size={16}/></button>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                {/* Lists */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><List size={16}/></button>
                    <button onClick={() => exec('insertOrderedList')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400"><ListOrdered size={16}/></button>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                {/* Media & Import */}
                <div className="flex items-center gap-0.5">
                    <button 
                        onClick={insertLink}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-blue-500 dark:text-blue-400" 
                        title="Chèn Link"
                    >
                        <LinkIcon size={16}/>
                    </button>

                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-emerald-600 dark:text-emerald-400" 
                        title="Chèn ảnh (Nén)"
                    >
                        <ImageIcon size={16}/>
                    </button>
                    <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden"
                    />

                    <button 
                        onClick={() => docInputRef.current?.click()} 
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-blue-600 dark:text-blue-400" 
                        title="Import PDF/Word"
                    >
                        <FileUp size={16}/>
                    </button>
                    <input 
                        type="file" 
                        accept=".pdf,.docx" 
                        ref={docInputRef} 
                        onChange={handleDocImport} 
                        className="hidden"
                    />
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>

                {/* Color & Font */}
                <div className="flex items-center gap-2">
                    <div className="relative group/color cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center justify-center">
                        <Palette size={16} className="text-slate-600 dark:text-slate-400"/>
                        <input 
                            type="color" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={(e) => exec('foreColor', e.target.value)}
                            title="Màu chữ"
                        />
                    </div>
                    
                    <div className="relative">
                        <select 
                            className="appearance-none bg-transparent text-xs font-medium text-slate-600 dark:text-slate-300 pl-2 pr-6 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded cursor-pointer outline-none w-24 truncate"
                            onChange={(e) => {
                                setFontName(e.target.options[e.target.selectedIndex].text);
                                exec('fontName', e.target.value);
                            }}
                            title="Font chữ"
                        >
                            {fonts.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    </div>
                </div>
            </div>
            
            {/* Editor Container - Removed p-6 for full width */}
            <div className="flex-1 overflow-y-auto relative flex flex-col cursor-text relative editor-scroll-container" onClick={() => editorRef.current?.focus()}>
                
                {/* Floating Image Toolbar */}
                {selectedImage && (
                    <div 
                        className="absolute z-50 flex items-center gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200"
                        style={{ top: Math.max(10, imgToolbarPos.y), left: Math.max(10, imgToolbarPos.x) }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                    >
                        <button onClick={() => resizeImage('small')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">25%</button>
                        <button onClick={() => resizeImage('medium')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">50%</button>
                        <button onClick={() => resizeImage('large')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">75%</button>
                        <button onClick={() => resizeImage('auto')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs font-bold text-gray-600 dark:text-gray-300">Auto</button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>
                        <button onClick={downloadImage} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-500" title="Tải xuống"><Download size={14}/></button>
                        <button onClick={removeImage} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500" title="Xóa ảnh"><Trash size={14}/></button>
                    </div>
                )}

                {/* AI Summary Box - Enhanced Collapsible Card Style */}
                {summary ? (
                    <div className="m-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 overflow-hidden shadow-sm transition-all duration-300 select-none">
                        <div 
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition"
                            onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-emerald-500 fill-emerald-500/20" />
                                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                    Tóm tắt AI (Summary)
                                </span>
                            </div>
                            <button className="p-1 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition">
                                {isSummaryExpanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                            </button>
                        </div>
                        
                        {isSummaryExpanded && (
                            <div className="px-5 pb-5 pt-2 border-t border-emerald-100 dark:border-emerald-900/30">
                                <div 
                                    className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100/80 prose prose-sm prose-emerald dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{__html: summary.replace(/\n/g, '<br/>')}} 
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div 
                        onClick={onOpenAISidebar}
                        className="m-5 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition group select-none"
                    >
                        <div className="flex items-start gap-3">
                            <Sparkles size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    Ghi chú chưa tóm tắt
                                </h4>
                                <p className="text-xs text-gray-400 dark:text-slate-500 italic mt-1">
                                    Nội dung tóm tắt sẽ hiển thị tại đây...
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Content Editable */}
                <div 
                    ref={editorRef}
                    className="flex-1 outline-none prose prose-slate max-w-none dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 prose-img:rounded-xl prose-img:shadow-sm page-view-editor"
                    contentEditable
                    onInput={handleChange}
                    onKeyUp={handleKeyUp}
                    onKeyDown={handleKeyDown}
                    data-placeholder={placeholder}
                    style={{ fontSize: '15px', lineHeight: '1.7', minHeight: '100px' }}
                />
            </div>

            {/* Footer Stats Bar */}
            <div className="absolute bottom-2 right-4 z-20 pointer-events-none print:hidden flex gap-2">
                 <div className="bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-2">
                     <span>Trang {stats.currentPage}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                     <span>{stats.words} từ</span>
                 </div>
            </div>

            {/* Floating Shortcut Help Button */}
            <div className="absolute bottom-12 right-4 z-20 print:hidden">
                <button 
                    onClick={() => setShowShortcuts(!showShortcuts)}
                    className={`p-2.5 rounded-full shadow-lg transition-all ${showShortcuts ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-emerald-600 border border-gray-100 dark:border-slate-700'}`}
                    title="Phím tắt gõ nhanh"
                >
                    {showShortcuts ? <X size={20}/> : <Keyboard size={20}/>}
                </button>

                {/* Shortcuts Popover */}
                {showShortcuts && (
                    <div className="absolute bottom-14 right-0 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-4 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                            <HelpCircle size={16} className="text-emerald-500"/>
                            Phím tắt (Markdown)
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {shortcuts.map((s, i) => (
                                <div key={i} className="flex justify-between items-center text-xs group hover:bg-gray-50 dark:hover:bg-slate-700/50 p-1 rounded">
                                    <code className="bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-gray-200 dark:border-slate-600">{s.key}</code>
                                    <span className="text-gray-500 dark:text-slate-400">{s.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #94a3b8;
                    font-style: italic;
                }
                audio {
                    width: 100%;
                    max-width: 400px;
                    height: 40px;
                    border-radius: 20px;
                }
                /* Custom scrollbar for editor content */
                .prose::-webkit-scrollbar { width: 6px; }
                .prose::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; }
                .dark .prose::-webkit-scrollbar-thumb { background-color: #334155; }
                
                /* Image Selection Highlight */
                img {
                    transition: box-shadow 0.2s;
                }
                img:hover {
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.4);
                    cursor: pointer;
                }

                /* Page View Style */
                .page-view-editor {
                    background-image: url('${svgLightUrl}');
                    background-size: 100% ${PAGE_HEIGHT_PX}px;
                    background-repeat: repeat-y;
                    /* Padding Top/Bottom: 40px for page break visualization */
                    /* Padding Left/Right: 20px to match Summary Box p-5 (20px) since container padding is removed */
                    padding: 40px 20px; 
                }
                .dark .page-view-editor {
                    background-image: url('${svgDarkUrl}');
                }
            `}</style>
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;