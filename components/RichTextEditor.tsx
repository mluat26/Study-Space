import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, RotateCcw, RotateCw, Type, Palette, ChevronDown, Sparkles } from 'lucide-react';

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
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ initialContent, onChange, placeholder, onSave }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [fontName, setFontName] = useState('Inter');
    const [summary, setSummary] = useState('');

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
            // If we have a summary, prepend it as a hidden div for storage/persistence
            // We use 'ai-summary-content' class for backward compatibility and parsing
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
        }
    }));

    // Initial Load Parsing
    useEffect(() => {
        if (initialContent) {
            // Create a temporary DOM to parse the content
            const parser = new DOMParser();
            const doc = parser.parseFromString(initialContent, 'text/html');
            
            // Check for hidden summary div (using the class we save with)
            const summaryDiv = doc.querySelector('.ai-summary-content');
            
            // Check for legacy/alternative class just in case
            const legacySummaryDiv = doc.querySelector('.smartstudy-ai-summary');

            const targetDiv = summaryDiv || legacySummaryDiv;

            if (targetDiv) {
                setSummary(targetDiv.innerHTML);
                targetDiv.remove(); // Remove from the content that goes into the editable area
                if(editorRef.current) editorRef.current.innerHTML = doc.body.innerHTML;
            } else {
                setSummary('');
                if(editorRef.current) editorRef.current.innerHTML = initialContent;
            }
        } else {
            setSummary('');
            if(editorRef.current) editorRef.current.innerHTML = '';
        }
    }, []); // Run once on mount

    const handleChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const exec = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        handleChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if(onSave) onSave();
            return;
        }
    };

    const fonts = [
        { name: 'Sans Serif', value: 'Inter, sans-serif' },
        { name: 'Serif', value: 'Merriweather, serif' },
        { name: 'Monospace', value: 'Fira Code, monospace' },
        { name: 'Cursive', value: 'Comic Sans MS, cursive' },
    ];

    return (
        <div className="flex flex-col h-full border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-colors relative group">
            
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
            
            {/* Editor Container */}
            <div className="flex-1 overflow-y-auto relative flex flex-col p-6 cursor-text" onClick={() => editorRef.current?.focus()}>
                
                {/* AI Summary Box */}
                <div className={`mb-6 p-5 rounded-2xl transition-all duration-300 select-none ${summary ? 'bg-emerald-50 dark:bg-emerald-900/10 opacity-100' : 'bg-slate-50 dark:bg-slate-800/30 opacity-40 hover:opacity-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className={summary ? "text-emerald-500" : "text-gray-400"} />
                        <span className={`text-sm font-bold ${summary ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`}>
                            {summary ? "Tóm tắt AI" : "Ghi chú chưa tóm tắt"}
                        </span>
                    </div>
                    <div className={`text-sm leading-relaxed ${summary ? "text-emerald-900 dark:text-emerald-100/80" : "text-gray-400 italic"}`}>
                        {summary ? (
                            <div dangerouslySetInnerHTML={{__html: summary.replace(/\n/g, '<br/>')}} />
                        ) : (
                            <span>Nội dung tóm tắt sẽ hiển thị tại đây...</span>
                        )}
                    </div>
                </div>

                {/* Content Editable */}
                <div 
                    ref={editorRef}
                    className="flex-1 outline-none prose prose-slate max-w-none dark:prose-invert prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4"
                    contentEditable
                    onInput={handleChange}
                    onKeyDown={handleKeyDown}
                    data-placeholder={placeholder}
                    style={{ fontSize: '15px', lineHeight: '1.7', minHeight: '100px' }}
                />
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
            `}</style>
        </div>
    );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;