import React, { useState, useEffect, useRef } from 'react';
import { Subject, Task, Note, Resource, Language, TrashItem } from './types';
import { INITIAL_SUBJECTS, INITIAL_TASKS, INITIAL_NOTES, INITIAL_RESOURCES, COLORS, ICONS, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import SubjectDetail from './components/SubjectDetail';
import SearchManager from './components/SearchManager';
import { DataExportImport } from './components/DataExportImport';
import { LayoutGrid, Search, Moon, Sun, Database, HardDrive, Download, X, GraduationCap, BookOpen, Menu, ChevronLeft, ChevronRight, Trash2, MoreHorizontal, ArrowUp, ArrowDown, PenSquare, GripVertical, ListFilter, Plus, CheckCircle, FileText, Palette, AlertTriangle, RefreshCcw, Upload, ChevronDown, RotateCcw, Link as LinkIcon, FileAudio, Maximize2, Archive, RotateCw, AlertCircle, UploadCloud } from 'lucide-react';
import { dbGet, dbSet, dbClear, getUsageEstimate } from './utils/indexedDB';

const IconPicker = ({ selected, onSelect }: { selected: string, onSelect: (i: string) => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'image/svg+xml') {
                alert('Vui lòng chọn file SVG');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                const svgContent = ev.target?.result as string;
                // Simple validation check
                if (svgContent.includes('<svg')) {
                    onSelect(svgContent);
                }
            };
            reader.readAsText(file);
        }
    };

    const isCustomSvg = selected.startsWith('<svg');

    return (
        <div className="grid grid-cols-6 gap-2 mt-2">
            {Object.keys(ICONS).map(key => {
                const Icon = ICONS[key];
                return (
                    <button
                        key={key}
                        onClick={() => onSelect(key)}
                        className={`p-2 rounded-lg flex items-center justify-center transition ${selected === key ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300'}`}
                    >
                        <Icon size={20} />
                    </button>
                )
            })}
            <button
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-lg flex items-center justify-center transition border-2 border-dashed ${isCustomSvg ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'border-gray-300 dark:border-slate-600 hover:border-emerald-500 text-gray-400 hover:text-emerald-500'}`}
                title="Upload SVG Icon"
            >
                <UploadCloud size={20} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                accept=".svg" 
                className="hidden" 
                onChange={handleFileUpload}
            />
            {isCustomSvg && (
                <div className="col-span-6 mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    <CheckCircle size={16}/> Đã chọn icon tùy chỉnh
                    <div className="w-6 h-6 ml-auto" dangerouslySetInnerHTML={{ __html: selected }} />
                </div>
            )}
        </div>
    )
}

const SubjectDrawer = ({ isOpen, onClose, onSave, lang, initialData }: any) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [createdAt, setCreatedAt] = useState('');
    
    // Color Logic
    const [selectedColor, setSelectedColor] = useState('bg-blue-500'); 
    const [showCustomColor, setShowCustomColor] = useState(false);
    const [customHex, setCustomHex] = useState('#3b82f6'); 

    const [icon, setIcon] = useState('Book');
    const t = TRANSLATIONS[lang];

    const baseColors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 
        'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
        'bg-pink-500', 'bg-rose-500', 'bg-slate-500'
    ];

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setDesc(initialData.description);
                setIcon(initialData.icon);
                setCreatedAt(initialData.createdAt ? new Date(initialData.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                
                if (initialData.color.startsWith('#')) {
                    setShowCustomColor(true);
                    setCustomHex(initialData.color);
                    setSelectedColor('custom');
                } else {
                    const cleanColor = initialData.color.split('/')[0];
                    setSelectedColor(baseColors.includes(cleanColor) ? cleanColor : 'bg-blue-500');
                    setShowCustomColor(false);
                }
            } else {
                setName('');
                setDesc('');
                setCreatedAt(new Date().toISOString().split('T')[0]);
                setSelectedColor('bg-blue-500');
                setShowCustomColor(false);
                setCustomHex('#3b82f6');
                setIcon('Book');
            }
        }
    }, [isOpen, initialData]);

    const finalColor = showCustomColor ? customHex : selectedColor;

    if (!isOpen) return null;
    
    const handleSubmit = () => {
        if(name) {
            onSave({ 
                id: initialData ? initialData.id : Date.now().toString(),
                name, 
                description: desc, 
                color: finalColor, 
                icon,
                createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString()
            });
            onClose();
        }
    }

    return (
        <>
        <div className="fixed inset-0 bg-black/30 z-[60] transition-opacity" onClick={onClose}></div>
        <div className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white dark:bg-slate-900 z-[70] shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    {initialData ? 'Chỉnh sửa môn học' : t.createSubject}
                </h2>
                <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.name}</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition dark:bg-slate-950 dark:text-white" placeholder="..." autoFocus/>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.desc}</label>
                    <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition dark:bg-slate-950 dark:text-white" placeholder="..." />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Ngày tạo</label>
                    <input type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none transition dark:bg-slate-950 dark:text-white" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.icon}</label>
                    <IconPicker selected={icon} onSelect={setIcon} />
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t.color}</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {baseColors.map(c => (
                            <button 
                                key={c} 
                                onClick={() => { setSelectedColor(c); setShowCustomColor(false); }}
                                className={`w-8 h-8 rounded-full ${c} ${selectedColor === c && !showCustomColor ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500 scale-110' : 'hover:scale-110'} transition-all`}
                            />
                        ))}
                        <button 
                            onClick={() => { setShowCustomColor(true); setSelectedColor('custom'); }}
                            className={`w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:border-emerald-500 transition-all ${showCustomColor ? 'ring-2 ring-offset-2 ring-emerald-500 border-emerald-500 text-emerald-500' : ''}`}
                            title="Tùy chỉnh màu"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </button>
                    </div>

                    {showCustomColor && (
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm border border-gray-200 dark:border-slate-600 flex-shrink-0">
                                    <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 block">Mã màu (Hex)</label>
                                    <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                        <span className="text-gray-400 mr-2">#</span>
                                        <input value={customHex.replace('#', '')} onChange={(e) => setCustomHex(`#${e.target.value}`)} className="w-full outline-none bg-transparent text-sm font-mono text-gray-800 dark:text-white uppercase" maxLength={6}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={`mt-4 h-14 rounded-xl w-full flex items-center justify-center shadow-sm transition-all duration-200 relative overflow-hidden text-white font-bold text-lg ${!showCustomColor ? selectedColor : ''}`} style={{ backgroundColor: showCustomColor ? customHex : undefined }}>{name || 'Tên môn học'}</div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <button onClick={handleSubmit} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">{t.save}</button>
            </div>
        </div>
        </>
    )
}

const StorageView = ({ subjects, tasks, notes, resources, trash, onDeleteSubject, onDeleteTask, onDeleteNote, onDeleteResource, onRestore, onPermanentDelete, onResetData, onOpenExport, onOpenImport }: any) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'tasks' | 'notes' | 'trash'>('overview');
    const [usage, setUsage] = useState({ usage: 0, quota: 0 });

    useEffect(() => {
        const updateUsage = async () => {
            const data = await getUsageEstimate();
            setUsage(data);
        };
        updateUsage();
        const interval = setInterval(updateUsage, 5000);
        return () => clearInterval(interval);
    }, [subjects, tasks, notes]);

    const percent = usage.quota > 0 ? (usage.usage / usage.quota) * 100 : 0;
    const usedMB = (usage.usage / 1024 / 1024).toFixed(2);
    const quotaDisplay = (usage.quota / 1024 / 1024 / 1024).toFixed(1) + ' GB';

    const handleDeleteAll = async () => {
        if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ dữ liệu của bạn và không thể khôi phục. Bạn có chắc chắn không?')) {
            if(window.confirm('Xác nhận lần 2: Tất cả ghi chú, công việc và file ghi âm sẽ bị xóa vĩnh viễn.')) {
                await onResetData();
            }
        }
    }

    const getSize = (item: any) => {
        const str = JSON.stringify(item);
        const bytes = new Blob([str]).size;
        return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
    }

    const getSubjectName = (id: string) => subjects.find((s: any) => s.id === id)?.name || 'Unknown';

    const tabs = [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'subjects', label: 'Môn học' },
        { id: 'tasks', label: 'Công việc' },
        { id: 'notes', label: 'Ghi chú' },
        { id: 'trash', label: 'Thùng rác' },
    ];

    const renderTable = (data: any[], type: 'subject' | 'task' | 'note' | 'trash') => {
        if (data.length === 0) return <div className="text-center py-12 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">Trống</div>;

        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                        <tr>
                            <th className="px-6 py-4">Tên / Tiêu đề</th>
                            {type !== 'subject' && type !== 'trash' && <th className="px-6 py-4">Môn học</th>}
                            <th className="px-6 py-4">Dung lượng</th>
                            <th className="px-6 py-4 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                                <td className="px-6 py-4 font-medium text-gray-800 dark:text-white truncate max-w-xs">
                                    {type === 'trash' ? item.originalName : (item.title || item.name)}
                                    {type === 'subject' && item.isArchived && <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 text-[10px] rounded-full">Archived</span>}
                                </td>
                                {type !== 'subject' && type !== 'trash' && <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{getSubjectName(item.subjectId)}</td>}
                                <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-slate-400">{getSize(type === 'trash' ? item.data : item)}</td>
                                <td className="px-6 py-4 text-right">
                                    {type === 'trash' ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onRestore(item.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition" title="Khôi phục"><RotateCw size={16}/></button>
                                            <button onClick={() => onPermanentDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Xóa vĩnh viễn"><Trash2 size={16}/></button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                if (type === 'subject') onDeleteSubject(item.id);
                                                if (type === 'task') onDeleteTask(item.id);
                                                if (type === 'note') onDeleteNote(item.id);
                                            }} 
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title="Chuyển vào thùng rác"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 p-8 overflow-y-auto transition-colors">
             <div className="max-w-5xl mx-auto w-full">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Quản lý Lưu trữ</h2>
                
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <div className="bg-white dark:bg-slate-900/60 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <HardDrive size={40} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-2">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">IndexedDB Storage</h3>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{usedMB} MB / {quotaDisplay}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-950 h-4 rounded-full overflow-hidden border border-gray-200 dark:border-slate-800">
                                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-500" style={{ width: `${Math.max(percent, 1)}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500/70 mt-2">Dữ liệu được lưu trữ an toàn trên trình duyệt của bạn với dung lượng lớn.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button onClick={onOpenExport} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">
                                <Download size={20} /> Xuất Dữ Liệu (Backup)
                            </button>
                            
                            <button onClick={onOpenImport} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none">
                                <Upload size={20} /> Nhập Dữ Liệu (Restore)
                            </button>
                        </div>

                        <button onClick={handleDeleteAll} className="w-full flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 px-6 py-3 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                            <Trash2 size={20} /> Xóa toàn bộ dữ liệu
                        </button>
                    </div>
                )}

                {activeTab === 'subjects' && renderTable(subjects, 'subject')}
                {activeTab === 'tasks' && renderTable(tasks, 'task')}
                {activeTab === 'notes' && renderTable(notes, 'note')}
                {activeTab === 'trash' && renderTable(trash, 'trash')}
             </div>
        </div>
    )
}

const QuickCreateDrawer = ({ subjects, isOpen, onClose, onSave }: { subjects: Subject[], isOpen: boolean, onClose: () => void, onSave: (type: 'task' | 'note', subjectId: string, content: string) => void }) => {
    const [type, setType] = useState<'task' | 'note'>('note');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [content, setContent] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if(isOpen) {
            setContent('');
            setSelectedSubjectId('');
            setType('note');
            setIsExpanded(false);
        }
    }, [isOpen]);

    if(!isOpen) return null;

    const handleSave = () => {
        if(selectedSubjectId && content.trim()) {
            onSave(type, selectedSubjectId, content);
            onClose();
        }
    }

    const validSubjects = subjects.filter(s => !s.isArchived);
    const limit = 5; // Updated limit
    const shouldShowExpand = validSubjects.length > limit;
    const displayedSubjects = isExpanded ? validSubjects : validSubjects.slice(0, limit);

    return (
        <>
        <div className="fixed inset-0 bg-black/30 z-[100] transition-opacity" onClick={onClose}></div>
        <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white dark:bg-slate-900 z-[110] shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                    <Plus className="text-emerald-500" size={20}/> Note ngay
                </h3>
                <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button onClick={() => setType('note')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition ${type === 'note' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`}><FileText size={16}/> Ghi chú</button>
                      <button onClick={() => setType('task')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition ${type === 'task' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`}><CheckCircle size={16}/> Task</button>
                  </div>

                  <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-3">Chọn môn học</label>
                       <div className="relative">
                           <div className="grid grid-cols-3 gap-2 max-h-[350px] overflow-y-auto pr-1 pb-4 scrollbar-hide">
                              {displayedSubjects.map(s => {
                                  const isCustomColor = s.color.startsWith('#');
                                  const bgStyle = isCustomColor ? { backgroundColor: s.color } : {};
                                  const bgClass = isCustomColor ? '' : s.color;
                                  
                                  const renderIcon = () => {
                                    if (s.icon.startsWith('<svg')) {
                                        return <div className="w-[18px] h-[18px]" dangerouslySetInnerHTML={{ __html: s.icon }} />
                                    }
                                    const IconComp = ICONS[s.icon] || BookOpen;
                                    return <IconComp size={18} />;
                                  };

                                  const isSelected = selectedSubjectId === s.id;
                                  
                                  return (
                                  <button
                                      key={s.id}
                                      onClick={() => setSelectedSubjectId(s.id)}
                                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all group ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                  >
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0 ${bgClass} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`} style={bgStyle}>
                                          {renderIcon()}
                                      </div>
                                      <span className={`text-xs font-bold truncate w-full text-center ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-slate-300'}`}>
                                          {s.name}
                                      </span>
                                  </button>
                              )})}
                              {shouldShowExpand && !isExpanded && (
                                  <button 
                                    onClick={() => setIsExpanded(true)}
                                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all text-gray-500"
                                  >
                                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                          <MoreHorizontal size={20}/>
                                      </div>
                                      <span className="text-xs font-bold text-center">Xem thêm</span>
                                  </button>
                              )}
                           </div>
                       </div>
                  </div>

                  <div className="relative pb-4">
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">{type === 'note' ? 'Tiêu đề ghi chú' : 'Tên công việc'}</label>
                      <input 
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSave()}
                          className="w-full p-4 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 transition dark:bg-slate-950 dark:text-white text-lg font-medium placeholder:font-normal"
                          placeholder={type === 'note' ? 'Nhập tiêu đề...' : 'Nhập tên task...'}
                          autoFocus
                      />
                  </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 font-medium text-sm">Hủy</button>
                <button 
                  onClick={handleSave} 
                  disabled={!selectedSubjectId || !content.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                    Lưu
                </button>
            </div>
        </div>
        </>
    )
}

const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>('vi');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 

  const [currentView, setCurrentView] = useState<'dashboard' | 'search' | 'storage' | string>('dashboard'); 
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false);

  const [minimizedNote, setMinimizedNote] = useState<Note | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [showDataTransfer, setShowDataTransfer] = useState(false);
  const [transferMode, setTransferMode] = useState<'export' | 'import'>('export');

  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false); 
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
  const [storageDisplay, setStorageDisplay] = useState('0.00');

  useEffect(() => {
    const loadData = async () => {
        try {
            const s = await dbGet<Subject[]>('smartstudy_subjects');
            const t = await dbGet<Task[]>('smartstudy_tasks');
            const n = await dbGet<Note[]>('smartstudy_notes');
            const r = await dbGet<Resource[]>('smartstudy_resources');
            const tr = await dbGet<TrashItem[]>('smartstudy_trash'); 
            const dm = await dbGet<boolean>('smartstudy_darkmode');
            const l = await dbGet<Language>('smartstudy_lang');
            const sc = await dbGet<boolean>('smartstudy_sidebar_collapsed');

            setSubjects(s || INITIAL_SUBJECTS);
            setTasks(t || INITIAL_TASKS);
            setNotes(n || INITIAL_NOTES);
            setResources(r || INITIAL_RESOURCES);
            setTrash(tr || []);
            setDarkMode(dm || false);
            setLang(l || 'vi');
            setIsSidebarCollapsed(sc || false);

            setIsDataLoaded(true);
        } catch (error) {
            console.error("Failed to load IndexedDB", error);
            setSubjects(INITIAL_SUBJECTS);
            setIsDataLoaded(true);
        }
    };
    loadData();
  }, []);

  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_subjects', subjects); }, [subjects, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_tasks', tasks); }, [tasks, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_notes', notes); }, [notes, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_resources', resources); }, [resources, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_trash', trash); }, [trash, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_darkmode', darkMode); }, [darkMode, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_lang', lang); }, [lang, isDataLoaded]);
  useEffect(() => { if (isDataLoaded) dbSet('smartstudy_sidebar_collapsed', isSidebarCollapsed); }, [isSidebarCollapsed, isDataLoaded]);

  useEffect(() => {
      const updateEstimate = async () => {
          const est = await getUsageEstimate();
          setStorageDisplay((est.usage / 1024 / 1024).toFixed(2));
      };
      if (isDataLoaded) updateEstimate();
  }, [subjects, tasks, notes, resources, trash, isDataLoaded]);


  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
      if (activeNoteId) {
          setIsSidebarCollapsed(true);
      }
  }, [activeNoteId]);

  const activeSubject = subjects.find(s => s.id === currentView);
  const t = TRANSLATIONS[lang];

  const [draggedSubjectId, setDraggedSubjectId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
      setDraggedSubjectId(id);
      e.dataTransfer.effectAllowed = 'move';
  }

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedSubjectId || draggedSubjectId === targetId) return;

      const newSubjects = [...subjects];
      const draggedIndex = newSubjects.findIndex(s => s.id === draggedSubjectId);
      const targetIndex = newSubjects.findIndex(s => s.id === targetId);

      const [reorderedItem] = newSubjects.splice(draggedIndex, 1);
      newSubjects.splice(targetIndex, 0, reorderedItem);

      setSubjects(newSubjects);
      setDraggedSubjectId(null);
  }

  const handleAddSubject = (subject: Subject) => setSubjects(prev => [...prev, subject]);
  
  const handleUpdateSubject = (updatedSubject: Subject) => {
      setSubjects(prev => prev.map(s => s.id === updatedSubject.id ? updatedSubject : s));
  };

  const addToTrash = (type: TrashItem['type'], data: any, originalName: string, relatedData?: any) => {
    const trashItem: TrashItem = {
        id: Date.now().toString() + Math.random(),
        originalId: data.id,
        type,
        data,
        originalName,
        deletedAt: new Date().toISOString(),
        relatedData
    };
    setTrash(prev => [trashItem, ...prev]);
  };

  const handleDeleteSubject = (id: string) => {
      const subjectToDelete = subjects.find(s => s.id === id);
      if(subjectToDelete) {
          const relatedTasks = tasks.filter(t => t.subjectId === id);
          const relatedNotes = notes.filter(n => n.subjectId === id);
          const relatedResources = resources.filter(r => r.subjectId === id);

          addToTrash('subject', subjectToDelete, subjectToDelete.name, {
              tasks: relatedTasks,
              notes: relatedNotes,
              resources: relatedResources
          });

          setSubjects(prev => prev.filter(s => s.id !== id));
          setTasks(prev => prev.filter(t => t.subjectId !== id));
          setNotes(prev => prev.filter(n => n.subjectId !== id));
          setResources(prev => prev.filter(r => r.subjectId !== id));
          
          if (currentView === id) setCurrentView('dashboard');
      }
  }

  const handleArchiveSubject = (id: string) => {
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, isArchived: !s.isArchived } : s));
  }
  
  const handleAddTask = (task: Task) => setTasks(prev => [...prev, task]);
  const handleUpdateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const handleDeleteTask = (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if(task) {
          addToTrash('task', task, task.title);
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }
  };

  const handleAddNote = (note: Note) => setNotes(prev => [...prev, note]);
  const handleUpdateNote = (note: Note) => setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  const handleDeleteNote = (noteId: string) => {
      const note = notes.find(n => n.id === noteId);
      if(note) {
          addToTrash('note', note, note.title);
          setNotes(prev => prev.filter(n => n.id !== noteId));
      }
  };

  const handleAddResource = (res: Resource) => setResources(prev => [...prev, res]);
  const handleDeleteResource = (resId: string) => {
      const res = resources.find(r => r.id === resId);
      if(res) {
          addToTrash('resource', res, res.title);
          setResources(prev => prev.filter(r => r.id !== resId));
      }
  };

  const handleRestoreFromTrash = (trashId: string) => {
      const item = trash.find(t => t.id === trashId);
      if(!item) return;

      if(item.type === 'subject') {
          setSubjects(prev => [...prev, item.data]);
          if(item.relatedData) {
              if(item.relatedData.tasks) setTasks(prev => [...prev, ...item.relatedData!.tasks!]);
              if(item.relatedData.notes) setNotes(prev => [...prev, ...item.relatedData!.notes!]);
              if(item.relatedData.resources) setResources(prev => [...prev, ...item.relatedData!.resources!]);
          }
      } else if (item.type === 'task') {
          setTasks(prev => [...prev, item.data]);
      } else if (item.type === 'note') {
          setNotes(prev => [...prev, item.data]);
      } else if (item.type === 'resource') {
          setResources(prev => [...prev, item.data]);
      }

      setTrash(prev => prev.filter(t => t.id !== trashId));
  };

  const handlePermanentDelete = (trashId: string) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn mục này? Không thể khôi phục.")) {
          setTrash(prev => prev.filter(t => t.id !== trashId));
      }
  };

  const openAddModal = () => { setEditingSubject(null); setIsModalOpen(true); }
  const openEditModal = (subject: Subject) => { setEditingSubject(subject); setIsModalOpen(true); }

  const handleDirectOpenNote = (noteId: string, subjectId: string) => {
      setOpenedNoteId(noteId);
      setCurrentView(subjectId);
      setIsCreatingNote(false);
      setMinimizedNote(null); 
  }

  const handleViewChange = (newView: string) => {
      if (activeNoteId && activeNoteId !== 'new') {
          const noteToMinimize = notes.find(n => n.id === activeNoteId);
          if (noteToMinimize) {
              setMinimizedNote(noteToMinimize);
          }
      }
      
      setCurrentView(newView);
      setOpenedNoteId(null);
      setIsCreatingNote(false);
  }

  const handleResetData = async () => {
      await dbClear();
      setSubjects(INITIAL_SUBJECTS);
      setTasks(INITIAL_TASKS);
      setNotes(INITIAL_NOTES);
      setResources(INITIAL_RESOURCES);
      setTrash([]);
      alert("Đã xóa toàn bộ dữ liệu và khôi phục về mặc định.");
      window.location.reload();
  }

  const handleQuickCreate = (type: 'task' | 'note', subjectId: string, content: string) => {
      if (type === 'task') {
          const newTask: Task = {
              id: Date.now().toString(),
              subjectId,
              title: content,
              status: 'todo',
              dueDate: new Date().toISOString().split('T')[0],
              priority: 'Medium'
          };
          handleAddTask(newTask);
          setCurrentView(subjectId); 
      } else {
          const newNote: Note = {
              id: Date.now().toString(),
              subjectId,
              title: content,
              content: '',
              lastModified: new Date().toISOString()
          };
          handleAddNote(newNote);
          setOpenedNoteId(newNote.id);
          setCurrentView(subjectId); 
          setTimeout(() => setOpenedNoteId(newNote.id), 100);
      }
  }

  const handleMinimizeNote = (note: Note) => {
      setMinimizedNote(note);
      setOpenedNoteId(null);
  };

  const handleRestoreMinimizedNote = () => {
      if(minimizedNote) {
          setCurrentView(minimizedNote.subjectId);
          setOpenedNoteId(minimizedNote.id);
          setMinimizedNote(null);
      }
  };

  const handleImportData = async (data: { subjects: Subject[], notes: Note[], tasks: Task[], resources: Resource[] }, strategy: 'merge' | 'copy') => {
      if (strategy === 'copy') {
          const idMap: Record<string, string> = {};
          
          const newSubjects = data.subjects.map(s => {
              const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
              idMap[s.id] = newId;
              return { ...s, id: newId, name: `${s.name} (Imported)` };
          });

          const newNotes = data.notes.filter(n => idMap[n.subjectId]).map(n => ({
              ...n,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              subjectId: idMap[n.subjectId]
          }));

          const newTasks = data.tasks.filter(t => idMap[t.subjectId]).map(t => ({
              ...t,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              subjectId: idMap[t.subjectId]
          }));

          const newResources = data.resources.filter(r => idMap[r.subjectId]).map(r => ({
              ...r,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
              subjectId: idMap[r.subjectId]
          }));

          setSubjects(prev => [...prev, ...newSubjects]);
          setNotes(prev => [...prev, ...newNotes]);
          setTasks(prev => [...prev, ...newTasks]);
          setResources(prev => [...prev, ...newResources]);

      } else {
          const mergedSubjects = [...subjects];
          data.subjects.forEach(s => {
              const idx = mergedSubjects.findIndex(ex => ex.id === s.id);
              if (idx >= 0) mergedSubjects[idx] = s;
              else mergedSubjects.push(s);
          });

          const mergedNotes = [...notes];
          data.notes.forEach(n => {
              const idx = mergedNotes.findIndex(ex => ex.id === n.id);
              if (idx >= 0) mergedNotes[idx] = n;
              else mergedNotes.push(n);
          });

          const mergedTasks = [...tasks];
          data.tasks.forEach(t => {
              const idx = mergedTasks.findIndex(ex => ex.id === t.id);
              if (idx >= 0) mergedTasks[idx] = t;
              else mergedTasks.push(t);
          });

          const mergedResources = [...resources];
          data.resources.forEach(r => {
              const idx = mergedResources.findIndex(ex => ex.id === r.id);
              if (idx >= 0) mergedResources[idx] = r;
              else mergedResources.push(r);
          });

          setSubjects(mergedSubjects);
          setNotes(mergedNotes);
          setTasks(mergedTasks);
          setResources(mergedResources);
      }
      alert('Nhập dữ liệu thành công!');
  };

  const visibleSubjects = subjects.filter(s => !s.isArchived).slice(0, 4);
  const hiddenSubjects = subjects.filter(s => !s.isArchived).slice(4);

  if (!isDataLoaded) {
      return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-950">
          <RefreshCcw className="animate-spin text-emerald-500" size={32} />
      </div>;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-50 font-sans overflow-hidden transition-colors flex-row">
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 z-50 print:hidden relative shadow-sm`}>
        <div className={`p-6 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200 dark:shadow-none flex-shrink-0"><GraduationCap size={24} /></div>
          {!isSidebarCollapsed && <h1 className="font-bold text-xl tracking-tight text-gray-800 dark:text-white whitespace-nowrap overflow-hidden">StudyTask</h1>}
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <button onClick={() => setShowQuickNoteModal(true)} className={`w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl transition-all font-bold whitespace-nowrap bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
              <Plus size={24} strokeWidth={3} />
              {!isSidebarCollapsed && <span>Note ngay</span>}
          </button>
          {[ { id: 'dashboard', icon: LayoutGrid, label: t.dashboard }, { id: 'search', icon: Search, label: t.search } ].map(item => (
             <button key={item.id} onClick={() => handleViewChange(item.id)} title={item.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${currentView === item.id ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <item.icon size={20} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          <div className={`pt-6 pb-2 px-4 text-xs font-bold text-gray-400 dark:text-slate-500/70 uppercase tracking-wider ${isSidebarCollapsed ? 'text-center' : ''}`}>
             {!isSidebarCollapsed ? t.subjects : '---'}
          </div>
          <div className="space-y-1">
             {visibleSubjects.map(subject => {
                const renderIcon = () => {
                   if (subject.icon.startsWith('<svg')) {
                       return <div className="w-[18px] h-[18px]" dangerouslySetInnerHTML={{ __html: subject.icon }} />
                   }
                   const IconComp = ICONS[subject.icon] || BookOpen;
                   return <IconComp size={18} />;
                };

                return (
                    <div key={subject.id} draggable onDragStart={(e) => handleDragStart(e, subject.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, subject.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium group whitespace-nowrap cursor-pointer ${currentView === subject.id ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`} onClick={() => handleViewChange(subject.id)}>
                        {renderIcon()}
                        {!isSidebarCollapsed && <span className="truncate max-w-[140px]">{subject.name}</span>}
                    </div>
                )
             })}
             {hiddenSubjects.length > 0 && (
                 <button onClick={() => setIsSubMenuOpen(!isSubMenuOpen)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium group whitespace-nowrap text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 ${isSidebarCollapsed ? 'justify-center' : ''} ${isSubMenuOpen ? 'bg-gray-100 dark:bg-slate-800' : ''}`}>
                     <ListFilter size={18} />
                     {!isSidebarCollapsed && <span>Xem thêm...</span>}
                 </button>
             )}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
            {!isSidebarCollapsed && (
                <div className="px-2 mb-2">
                    <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1">
                        <span>Lưu trữ (IDB)</span>
                        <span>{storageDisplay} MB</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((parseFloat(storageDisplay)/500)*100, 100)}%` }}></div>
                    </div>
                </div>
            )}
            <button onClick={() => handleViewChange('storage')} title={t.storage} className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-medium whitespace-nowrap ${currentView === 'storage' ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <Database size={20} />
                {!isSidebarCollapsed && <span>{t.storage}</span>}
            </button>
            <div className={`flex gap-2 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                 <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} className="flex-1 flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 font-bold text-xs">{lang === 'vi' ? 'VI' : 'EN'}</button>
            </div>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-emerald-600 transition">
                 {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </div>
      </aside>

      {isSubMenuOpen && hiddenSubjects.length > 0 && (
          <div className="w-64 bg-gray-50 dark:bg-slate-900/80 border-r border-gray-100 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 animate-in slide-in-from-left-4 z-40 print:hidden backdrop-blur-md">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 dark:text-white">Môn học khác</h3>
                  <button onClick={() => setIsSubMenuOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {hiddenSubjects.map(subject => {
                      const renderIcon = () => {
                         if (subject.icon.startsWith('<svg')) {
                             return <div className="w-[18px] h-[18px]" dangerouslySetInnerHTML={{ __html: subject.icon }} />
                         }
                         const IconComp = ICONS[subject.icon] || BookOpen;
                         return <IconComp size={18} />;
                      };
                      return (
                          <div key={subject.id} draggable onDragStart={(e) => handleDragStart(e, subject.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, subject.id)} onClick={() => { handleViewChange(subject.id); setIsSubMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap text-left cursor-pointer group ${currentView === subject.id ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                               <div className="opacity-0 group-hover:opacity-50 cursor-grab"><GripVertical size={14}/></div>
                              {renderIcon()}
                              <span className="truncate">{subject.name}</span>
                          </div>
                      )
                  })}
              </div>
          </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-slate-950 transition-colors">
        {currentView === 'dashboard' ? (
          <Dashboard subjects={subjects} tasks={tasks} notes={notes} resources={resources} onSelectSubject={handleViewChange} onAddSubject={openAddModal} onDeleteSubject={handleDeleteSubject} onArchiveSubject={handleArchiveSubject} onUpdateTask={handleUpdateTask} onUpdateSubject={openEditModal} lang={lang} />
        ) : currentView === 'search' ? (
           <SearchManager tasks={tasks} notes={notes} subjects={subjects} onSelectSubject={handleViewChange} onSelectNote={handleDirectOpenNote}/>
        ) : currentView === 'storage' ? (
            <StorageView subjects={subjects} tasks={tasks} notes={notes} resources={resources} trash={trash} onDeleteSubject={handleDeleteSubject} onDeleteTask={handleDeleteTask} onDeleteNote={handleDeleteNote} onDeleteResource={handleDeleteResource} onRestore={handleRestoreFromTrash} onPermanentDelete={handlePermanentDelete} onResetData={handleResetData} onOpenExport={() => { setTransferMode('export'); setShowDataTransfer(true); }} onOpenImport={() => { setTransferMode('import'); setShowDataTransfer(true); }} />
        ) : activeSubject ? (
          <SubjectDetail subject={activeSubject} tasks={tasks.filter(t => t.subjectId === activeSubject.id)} notes={notes.filter(n => n.subjectId === activeSubject.id)} resources={resources.filter(r => r.subjectId === activeSubject.id)} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} onAddResource={handleAddResource} onDeleteResource={handleDeleteResource} onBack={() => handleViewChange('dashboard')} onEditSubject={() => openEditModal(activeSubject)} onArchiveSubject={() => handleArchiveSubject(activeSubject.id)} lang={lang} initialOpenNoteId={openedNoteId} isCreatingNote={isCreatingNote} onMinimize={handleMinimizeNote} onNoteActive={(noteId) => setActiveNoteId(noteId)} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-emerald-600 flex-col"><span className="text-6xl mb-4">🤔</span><p>{t.noSubjects}</p><button onClick={() => handleViewChange('dashboard')} className="mt-4 text-emerald-600 dark:text-emerald-400 font-medium hover:underline">{t.back}</button></div>
        )}
      </main>

      {minimizedNote && (
          <div className="fixed bottom-6 right-6 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-900 z-[150] overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform group animate-in slide-in-from-bottom-6 fade-in duration-300" onClick={handleRestoreMinimizedNote}>
              <div className="h-1.5 w-full bg-emerald-500"></div>
              <div className="p-4 flex items-start justify-between">
                  <div>
                      <h4 className="font-bold text-gray-800 dark:text-white line-clamp-1">{minimizedNote.title || 'Ghi chú chưa đặt tên'}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500"/> Đang thu nhỏ</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setMinimizedNote(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400"><X size={16}/></button>
              </div>
              <div className="px-4 pb-4"><div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"><Maximize2 size={12}/> Bấm để mở lại</div></div>
          </div>
      )}

      <SubjectDrawer isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(data: Subject) => { if (editingSubject) handleUpdateSubject(data); else handleAddSubject(data); }} lang={lang} initialData={editingSubject} />
      <QuickCreateDrawer subjects={subjects} isOpen={showQuickNoteModal} onClose={() => setShowQuickNoteModal(false)} onSave={handleQuickCreate} />
      <DataExportImport isOpen={showDataTransfer} mode={transferMode} onClose={() => setShowDataTransfer(false)} subjects={subjects} notes={notes} tasks={tasks} resources={resources} onImport={handleImportData} />
    </div>
  );
};

export default App;