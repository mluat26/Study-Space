import React, { useState } from 'react';
import { Subject, Task, Note } from '../types';
import { Search, FileText, CheckCircle, ArrowRight, Calendar, BookOpen, Clock } from 'lucide-react';

interface SearchManagerProps {
    tasks: Task[];
    notes: Note[];
    subjects: Subject[];
    onSelectSubject: (id: string) => void;
    onSelectNote?: (noteId: string, subjectId: string) => void;
}

const SearchManager: React.FC<SearchManagerProps> = ({ tasks, notes, subjects, onSelectSubject, onSelectNote }) => {
    const [activeSegment, setActiveSegment] = useState<'notes' | 'tasks'>('notes');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';
    const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color || 'bg-gray-500';

    const stripHtml = (html: string) => {
       const tmp = document.createElement("DIV");
       tmp.innerHTML = html;
       return tmp.textContent || tmp.innerText || "";
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 p-8 overflow-y-auto transition-colors">
            <div className="max-w-4xl mx-auto w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Tìm kiếm & Quản trị</h1>
                    <p className="text-gray-500 dark:text-slate-400">Quản lý nhanh tất cả Ghi chú và Công việc của bạn tại một nơi.</p>
                </div>

                {/* Search & Toggle */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder={`Tìm kiếm trong ${activeSegment === 'notes' ? 'ghi chú' : 'công việc'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm placeholder-gray-400 dark:placeholder-slate-600"
                        />
                     </div>
                     <div className="flex bg-gray-200 dark:bg-slate-900 p-1 rounded-xl flex-shrink-0">
                         <button 
                            onClick={() => setActiveSegment('notes')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition ${activeSegment === 'notes' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-slate-500'}`}
                         >
                             <FileText size={18}/> Ghi chú
                         </button>
                         <button 
                            onClick={() => setActiveSegment('tasks')}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition ${activeSegment === 'tasks' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-slate-500'}`}
                         >
                             <CheckCircle size={18}/> Công việc
                         </button>
                     </div>
                </div>

                {/* Content List */}
                <div className="space-y-4">
                    {activeSegment === 'notes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredNotes.map(note => (
                                <div 
                                    key={note.id} 
                                    onClick={() => onSelectNote && onSelectNote(note.id, note.subjectId)}
                                    className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition cursor-pointer group hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${getSubjectColor(note.subjectId)}`}></div>
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide truncate flex-1">{getSubjectName(note.subjectId)}</span>
                                        <span className="text-[10px] text-gray-300 dark:text-slate-600 flex-shrink-0">{new Date(note.lastModified).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="font-bold text-base text-gray-800 dark:text-white mb-1 group-hover:text-emerald-600 line-clamp-1">{note.title}</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400/70 line-clamp-1">
                                        {stripHtml(note.content)}
                                    </p>
                                </div>
                            ))}
                            {filteredNotes.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">Không tìm thấy ghi chú nào.</div>}
                        </div>
                    )}

                    {activeSegment === 'tasks' && (
                        <div className="grid gap-3">
                            {filteredTasks.map(task => (
                                <div 
                                    key={task.id}
                                    onClick={() => onSelectSubject(task.subjectId)} 
                                    className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 hover:border-emerald-500 transition flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'} dark:bg-slate-800 dark:text-slate-300`}>
                                            <CheckCircle size={20} />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-gray-800 dark:text-white ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>{task.title}</h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                                <span className="flex items-center gap-1"><BookOpen size={12}/> {getSubjectName(task.subjectId)}</span>
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {task.dueDate}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                    task.priority === 'High' ? 'bg-red-100 text-red-600' : 
                                                    task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                                }`}>{task.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition">
                                        <ArrowRight size={18} className="text-gray-400"/>
                                    </div>
                                </div>
                            ))}
                            {filteredTasks.length === 0 && <div className="text-center py-12 text-gray-400">Không tìm thấy công việc nào.</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchManager;