
import React, { useState, useRef } from 'react';
import { Subject, Note, Task, Resource } from '../types';
import { Download, Upload, CheckSquare, Square, ChevronRight, ChevronDown, FileText, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface DataExportImportProps {
    isOpen: boolean;
    mode: 'export' | 'import';
    onClose: () => void;
    subjects: Subject[];
    notes: Note[];
    tasks: Task[];
    resources: Resource[];
    onImport: (data: { subjects: Subject[], notes: Note[], tasks: Task[], resources: Resource[] }, strategy: 'merge' | 'copy') => Promise<void>;
}

export const DataExportImport: React.FC<DataExportImportProps> = ({
    isOpen, mode, onClose, subjects, notes, tasks, resources, onImport
}) => {
    const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    
    // Import State
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<any>(null);
    const [importStrategy, setImportStrategy] = useState<'merge' | 'copy'>('copy');
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // --- EXPORT LOGIC ---

    const toggleSubject = (id: string) => {
        const newSubjects = new Set(selectedSubjects);
        const newNotes = new Set(selectedNotes);
        
        if (newSubjects.has(id)) {
            newSubjects.delete(id);
            // Deselect all child notes
            notes.filter(n => n.subjectId === id).forEach(n => newNotes.delete(n.id));
        } else {
            newSubjects.add(id);
            // Select all child notes
            notes.filter(n => n.subjectId === id).forEach(n => newNotes.add(n.id));
        }
        setSelectedSubjects(newSubjects);
        setSelectedNotes(newNotes);
    };

    const toggleNote = (noteId: string, subjectId: string) => {
        const newNotes = new Set(selectedNotes);
        const newSubjects = new Set(selectedSubjects);

        if (newNotes.has(noteId)) {
            newNotes.delete(noteId);
            // If no notes selected for this subject, potentially uncheck subject? 
            // Logic: Subject checkbox represents "Include Subject Shell + All Children".
            // If we uncheck a note, the subject is strictly no longer "All Children", 
            // but we usually keep subject checked to ensure container exists.
            // Let's keep it simple: Subject check = Bulk select.
        } else {
            newNotes.add(noteId);
            newSubjects.add(subjectId); // Ensure parent is selected
        }
        setSelectedNotes(newNotes);
        setSelectedSubjects(newSubjects);
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedSubjects);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedSubjects(newExpanded);
    };

    const handleExport = () => {
        const exportData = {
            appName: 'SmartStudy',
            version: 1,
            exportedAt: new Date().toISOString(),
            data: {
                subjects: subjects.filter(s => selectedSubjects.has(s.id)),
                notes: notes.filter(n => selectedNotes.has(n.id)),
                // Include tasks/resources only if subject is selected (Simplified logic for now)
                tasks: tasks.filter(t => selectedSubjects.has(t.subjectId)),
                resources: resources.filter(r => selectedSubjects.has(r.subjectId))
            }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `smartstudy_export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        onClose();
    };

    // --- IMPORT LOGIC ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.appName !== 'SmartStudy') {
                    alert('File không hợp lệ (Sai AppName)');
                    return;
                }
                setImportFile(file);
                setImportPreview(json);
            } catch (err) {
                alert('Lỗi đọc file JSON');
            }
        };
        reader.readAsText(file);
    };

    const executeImport = async () => {
        if (!importPreview) return;
        setIsImporting(true);
        try {
            await onImport(importPreview.data, importStrategy);
            onClose();
        } catch (e) {
            alert('Import thất bại');
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-gray-100 dark:border-slate-800">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {mode === 'export' ? <Download className="text-emerald-500"/> : <Upload className="text-blue-500"/>}
                        {mode === 'export' ? 'Xuất dữ liệu' : 'Nhập dữ liệu'}
                    </h2>
                    <button onClick={onClose}><span className="text-gray-400 hover:text-red-500 text-2xl">&times;</span></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {mode === 'export' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Chọn môn học và ghi chú bạn muốn xuất ra file JSON.</p>
                            <div className="space-y-2">
                                {subjects.map(subject => {
                                    const subjectNotes = notes.filter(n => n.subjectId === subject.id);
                                    const isExpanded = expandedSubjects.has(subject.id);
                                    const isSelected = selectedSubjects.has(subject.id);
                                    
                                    return (
                                        <div key={subject.id} className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                            <div className={`flex items-center p-3 bg-gray-50 dark:bg-slate-800/50 ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                                                <button onClick={() => toggleExpand(subject.id)} className="p-1 mr-2 text-gray-400 hover:text-gray-600">
                                                    {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                                </button>
                                                <button onClick={() => toggleSubject(subject.id)} className={`mr-3 ${isSelected ? 'text-emerald-600' : 'text-gray-300'}`}>
                                                    {isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}
                                                </button>
                                                <span className="font-medium text-gray-800 dark:text-white flex-1">{subject.name}</span>
                                                <span className="text-xs text-gray-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-100 dark:border-slate-700">
                                                    {subjectNotes.length} notes
                                                </span>
                                            </div>
                                            
                                            {isExpanded && subjectNotes.length > 0 && (
                                                <div className="pl-12 pr-3 py-2 space-y-2 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                                                    {subjectNotes.map(note => (
                                                        <div key={note.id} className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 p-2 rounded-lg" onClick={() => toggleNote(note.id, subject.id)}>
                                                            <div className={`mr-3 ${selectedNotes.has(note.id) ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                                {selectedNotes.has(note.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                                            </div>
                                                            <FileText size={14} className="text-gray-400 mr-2"/>
                                                            <span className="text-sm text-gray-700 dark:text-slate-300 truncate">{note.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {!importPreview ? (
                                <div 
                                    className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={48} className="mb-4 text-blue-500 opacity-50"/>
                                    <p className="font-medium text-lg text-gray-600 dark:text-slate-300">Chọn file backup (.json)</p>
                                    <p className="text-sm mt-2">Nhấn để tải lên</p>
                                    <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange}/>
                                </div>
                            ) : (
                                <div className="animate-in fade-in zoom-in duration-200">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 mb-6 flex items-start gap-3">
                                        <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5" size={20}/>
                                        <div>
                                            <h3 className="font-bold text-emerald-800 dark:text-emerald-300">File hợp lệ</h3>
                                            <p className="text-sm text-emerald-600 dark:text-emerald-400/80 mt-1">
                                                Phiên bản: v{importPreview.version} • Ngày: {new Date(importPreview.exportedAt).toLocaleDateString()}
                                            </p>
                                            <div className="flex gap-4 mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                                <span>{importPreview.data.subjects.length} Môn học</span>
                                                <span>{importPreview.data.notes.length} Ghi chú</span>
                                                <span>{importPreview.data.tasks.length} Task</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setImportPreview(null); setImportFile(null); }} className="ml-auto text-emerald-400 hover:text-emerald-600"><RefreshCw size={16}/></button>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">Phương thức nhập</label>
                                        
                                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition ${importStrategy === 'copy' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                                            <input type="radio" name="strategy" checked={importStrategy === 'copy'} onChange={() => setImportStrategy('copy')} className="w-5 h-5 text-blue-600"/>
                                            <div>
                                                <span className="block font-bold text-gray-800 dark:text-white">Nhập như mới (An toàn)</span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">Tạo bản sao mới cho tất cả dữ liệu. Tránh trùng lặp ID.</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition ${importStrategy === 'merge' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                                            <input type="radio" name="strategy" checked={importStrategy === 'merge'} onChange={() => setImportStrategy('merge')} className="w-5 h-5 text-orange-600"/>
                                            <div>
                                                <span className="block font-bold text-gray-800 dark:text-white">Gộp dữ liệu (Merge)</span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">Ghi đè nếu ID trùng khớp. Dùng để khôi phục bản sao lưu cũ.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 font-medium text-sm">Đóng</button>
                    {mode === 'export' ? (
                        <button 
                            onClick={handleExport}
                            disabled={selectedSubjects.size === 0}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Download size={18}/> Xuất File
                        </button>
                    ) : (
                        <button 
                            onClick={executeImport}
                            disabled={!importPreview || isImporting}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isImporting ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>} Nhập Dữ Liệu
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
