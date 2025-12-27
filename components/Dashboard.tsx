import React, { useState } from 'react';
import { Subject, Task, Language, Note, Resource } from '../types';
import { Book, Clock, Plus, Trash2, LayoutGrid, List, Search, Archive, FolderOpen, ArrowRight, CheckCircle, Calendar, X, PenTool, FileText, Link as LinkIcon, Layers, Eye, EyeOff } from 'lucide-react';
import { ICONS, TRANSLATIONS } from '../constants';

interface DashboardProps {
  subjects: Subject[];
  tasks: Task[];
  notes?: Note[];     // Added optional props for stats
  resources?: Resource[]; // Added optional props for stats
  onSelectSubject: (id: string) => void;
  onAddSubject: () => void;
  onDeleteSubject: (id: string) => void;
  onArchiveSubject: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateSubject: (subject: Subject) => void;
  lang: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ subjects, tasks, notes = [], resources = [], onSelectSubject, onAddSubject, onDeleteSubject, onArchiveSubject, onUpdateTask, onUpdateSubject, lang }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTodayKanban, setShowTodayKanban] = useState(false);
  const [showDoneTasks, setShowDoneTasks] = useState(false); // Toggle for Done column
  
  const t = TRANSLATIONS[lang];

  const today = new Date().toISOString().split('T')[0];
  const tasksDueToday = tasks.filter(t => t.dueDate === today && t.status !== 'done');
  const tasksTodayCount = tasksDueToday.length;

  const kanbanTasks = tasks.filter(t => {
      if (t.status !== 'done') return true;
      return t.dueDate === today; 
  });

  const getTasksByStatus = (status: 'todo' | 'doing' | 'done') => kanbanTasks.filter(task => task.status === status);

  const displaySubjects = subjects.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const isArchived = s.isArchived || false;
      return matchesSearch && (activeTab === 'archived' ? isArchived : !isArchived);
  });

  const renderIcon = (iconName: string, className: string) => {
      const IconComp = ICONS[iconName] || Book;
      return <IconComp className={className} />;
  }

  const moveTask = (task: Task, newStatus: 'todo' | 'doing' | 'done') => {
      onUpdateTask({ ...task, status: newStatus });
  }
  
  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50 dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t.dashboard}</h1>
                <p className="text-gray-500 dark:text-slate-400 mt-1">{t.progress}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={t.search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-colors placeholder-gray-400 dark:placeholder-slate-600"
                    />
                 </div>
                <button onClick={onAddSubject} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition text-sm shadow-sm shadow-emerald-200 dark:shadow-none whitespace-nowrap">
                    + {t.createSubject}
                </button>
            </div>
        </div>

        {/* Stats Widgets */}
        {activeTab === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div 
                    onClick={() => setShowTodayKanban(true)}
                    className="cursor-pointer bg-gradient-to-br from-emerald-500 to-teal-400 dark:from-emerald-700 dark:to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-transform hover:scale-[1.02]"
                >
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-sm mb-1 uppercase tracking-wider">{t.today}</p>
                        <h2 className="text-5xl font-bold mb-2">{tasksTodayCount}</h2>
                        <p className="text-emerald-50 text-sm flex items-center gap-1">{t.tasksDue} <ArrowRight size={14}/></p>
                    </div>
                    <Clock className="absolute right-4 top-4 text-white/20 w-24 h-24 -mt-4 -mr-4" />
                </div>

                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">{t.progress}</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                            {lang === 'vi' 
                            ? `Bạn đang quản lý ${subjects.filter(s => !s.isArchived).length} môn học.` 
                            : `You are managing ${subjects.filter(s => !s.isArchived).length} active subjects.`}
                        </p>
                    </div>
                    <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <FolderOpen size={32}/>
                    </div>
                </div>
            </div>
        )}

        {/* Controls & Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200'}`}
                >
                    {t.active}
                </button>
                <button 
                    onClick={() => setActiveTab('archived')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'archived' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-200'}`}
                >
                    <Archive size={16}/> {t.archived}
                </button>
            </div>

            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200'}`}
                >
                    <LayoutGrid size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-200'}`}
                >
                    <List size={18} />
                </button>
            </div>
        </div>
        
        {/* Content View */}
        {displaySubjects.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-slate-800">
                <div className="bg-emerald-50 dark:bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                    <Book size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {activeTab === 'active' ? t.noSubjects : t.emptyArchive}
                </h3>
                {activeTab === 'active' && (
                    <button onClick={onAddSubject} className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline">{t.createSubject}</button>
                )}
            </div>
        ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displaySubjects.map(subject => {
                    const subjectTasks = tasks.filter(t => t.subjectId === subject.id);
                    const subjectNotes = notes.filter(n => n.subjectId === subject.id);
                    const subjectResources = resources.filter(r => r.subjectId === subject.id);
                    const pending = subjectTasks.filter(t => t.status !== 'done').length;

                    // Handle Color (Hex or Tailwind class)
                    const isCustomColor = subject.color.startsWith('#');
                    const cardStyle = isCustomColor ? { backgroundColor: subject.color } : {};
                    const cardClass = isCustomColor ? '' : subject.color;
                    
                    return (
                        <div 
                            key={subject.id} 
                            onClick={() => onSelectSubject(subject.id)}
                            className={`rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden h-full ${cardClass} dark:bg-opacity-80 dark:hover:bg-opacity-100`}
                            style={cardStyle}
                        >
                            {/* Watermark Icon */}
                            <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12 transition-transform group-hover:scale-110">
                                {renderIcon(subject.icon, "w-40 h-40 text-white")}
                            </div>

                            <div className="p-5 flex flex-col flex-1 relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white/90 bg-white/20 backdrop-blur-sm shadow-inner`}>
                                        {renderIcon(subject.icon, "w-6 h-6")}
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onUpdateSubject(subject); }}
                                            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
                                            title="Sửa"
                                        >
                                            <PenTool size={16} />
                                        </button>
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); onArchiveSubject(subject.id); }}
                                            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
                                            title={subject.isArchived ? t.restore : t.archive}
                                        >
                                            <Archive size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(window.confirm(t.deleteConfirm)) onDeleteSubject(subject.id); }}
                                            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-bold text-xl mb-1 line-clamp-1 tracking-tight text-white">{subject.name}</h3>
                                <p className="text-sm line-clamp-1 mb-6 font-medium text-white/70">{subject.description}</p>
                                
                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 mt-auto">
                                    <div className="bg-black/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-white/70 mb-1"><CheckCircle size={14} className="mx-auto"/></div>
                                        <span className="font-bold text-sm text-white">{pending}</span>
                                    </div>
                                    <div className="bg-black/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-white/70 mb-1"><FileText size={14} className="mx-auto"/></div>
                                        <span className="font-bold text-sm text-white">{subjectNotes.length}</span>
                                    </div>
                                    <div className="bg-black/10 backdrop-blur-sm rounded-lg p-2 text-center border border-white/5">
                                        <div className="text-white/70 mb-1"><LinkIcon size={14} className="mx-auto"/></div>
                                        <span className="font-bold text-sm text-white">{subjectResources.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {activeTab === 'active' && (
                    <button 
                        onClick={onAddSubject}
                        className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center p-6 text-gray-400 dark:text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-slate-800/50 transition min-h-[220px]"
                    >
                        <Plus size={32} className="mb-2" />
                        <span className="font-medium">Thêm môn học</span>
                    </button>
                )}
            </div>
        ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400 font-medium text-sm uppercase">
                        <tr>
                            <th className="px-6 py-4">{t.subjects}</th>
                            <th className="px-6 py-4 hidden md:table-cell">{t.desc}</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {displaySubjects.map(subject => {
                             const pending = tasks.filter(t => t.subjectId === subject.id && t.status !== 'done').length;
                             const total = tasks.filter(t => t.subjectId === subject.id).length;
                             
                             // Handle Color
                             const isCustomColor = subject.color.startsWith('#');
                             const iconStyle = isCustomColor ? { backgroundColor: subject.color } : {};
                             const iconClass = isCustomColor ? '' : subject.color;
                             const progressStyle = isCustomColor ? { backgroundColor: subject.color } : {};
                             const progressClass = isCustomColor ? '' : subject.color;

                             return (
                                <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer" onClick={() => onSelectSubject(subject.id)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${iconClass}`} style={iconStyle}>
                                                {renderIcon(subject.icon, "w-4 h-4")}
                                            </div>
                                            <span className="font-semibold text-gray-800 dark:text-white">{subject.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm hidden md:table-cell truncate max-w-xs">
                                        {subject.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{total - pending}/{total}</span>
                                            <div className="w-20 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${progressClass}`} 
                                                    style={{ width: `${total ? ((total-pending)/total)*100 : 0}%`, ...progressStyle }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 relative z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateSubject(subject); }}
                                                className="p-2 text-gray-400 hover:text-emerald-600 transition"
                                                title="Sửa"
                                            >
                                                <PenTool size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onArchiveSubject(subject.id); }}
                                                className="p-2 text-gray-400 hover:text-emerald-600 transition"
                                                title={subject.isArchived ? t.restore : t.archive}
                                            >
                                                <Archive size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if(window.confirm(t.deleteConfirm)) onDeleteSubject(subject.id); 
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                             )
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* TODAY KANBAN MODAL */}
      {showTodayKanban && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[80vh] rounded-3xl shadow-2xl flex flex-col border border-gray-100 dark:border-slate-800">
                 {/* ... (Kanban content remains same) ... */}
                 {/* Re-implementing truncated part to ensure file integrity */}
                 <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950 rounded-t-3xl">
                     <div>
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <LayoutGrid className="text-emerald-500"/>
                            Công việc (Tất cả)
                         </h2>
                         <p className="text-gray-500 dark:text-slate-400 text-sm">Quản lý trạng thái công việc</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowDoneTasks(!showDoneTasks)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition
                                ${showDoneTasks ? 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-950 dark:text-emerald-500'}
                            `}
                        >
                            {showDoneTasks ? <Eye size={16}/> : <EyeOff size={16}/>}
                            {showDoneTasks ? 'Ẩn đã xong' : 'Hiện đã xong'}
                        </button>
                        <button onClick={() => setShowTodayKanban(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition">
                            <X size={24} className="text-gray-500 dark:text-slate-400" />
                        </button>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-x-auto p-6 bg-gray-100 dark:bg-slate-950/50 rounded-b-3xl">
                    <div className="flex gap-6 h-full min-w-[1000px] md:min-w-0">
                         {/* TODO */}
                         <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                             <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                                 <h3 className="font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">
                                     <span className="w-3 h-3 rounded-full bg-slate-400"></span> {t.todo}
                                 </h3>
                                 <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 dark:text-slate-200">{getTasksByStatus('todo').length}</span>
                             </div>
                             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                 {getTasksByStatus('todo').map(task => {
                                     const subj = subjects.find(s => s.id === task.subjectId);
                                     return (
                                     <div key={task.id} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors group">
                                         <div className="flex justify-between items-start mb-2">
                                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                task.priority === 'High' ? 'bg-red-100 text-red-600' : 
                                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                             }`}>{task.priority}</span>
                                         </div>
                                         <p className="font-medium text-gray-800 dark:text-white mb-1">{task.title}</p>
                                         <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">{subj?.name}</p>
                                         <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                             <span className={`flex items-center gap-1 ${task.dueDate === today ? 'text-orange-500 font-bold' : ''}`}><Calendar size={12}/> {task.dueDate}</span>
                                             <button onClick={() => moveTask(task, 'doing')} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1">Start <ArrowRight size={12}/></button>
                                         </div>
                                     </div>
                                 )})}
                             </div>
                         </div>

                         {/* DOING */}
                         <div className="flex-1 flex flex-col bg-blue-50/50 dark:bg-slate-900 rounded-2xl p-4 border border-blue-100 dark:border-slate-800 shadow-sm">
                             <div className="flex items-center justify-between mb-4 pb-4 border-b border-blue-100 dark:border-slate-800">
                                 <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                     <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span> {t.doing}
                                 </h3>
                                 <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-300">{getTasksByStatus('doing').length}</span>
                             </div>
                             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                 {getTasksByStatus('doing').map(task => {
                                      const subj = subjects.find(s => s.id === task.subjectId);
                                      return (
                                     <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                                         <div className="flex justify-between items-start mb-2">
                                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                task.priority === 'High' ? 'bg-red-100 text-red-600' : 
                                                task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                             }`}>{task.priority}</span>
                                         </div>
                                         <p className="font-medium text-gray-800 dark:text-white mb-1">{task.title}</p>
                                         <p className="text-xs text-gray-500 dark:text-slate-300 mb-3">{subj?.name}</p>
                                         <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                              <button onClick={() => moveTask(task, 'todo')} className="text-gray-400 hover:text-gray-600">&larr; Todo</button>
                                             <button onClick={() => moveTask(task, 'done')} className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 px-2 py-1 rounded flex items-center gap-1">Done <CheckCircle size={12}/></button>
                                         </div>
                                     </div>
                                 )})}
                             </div>
                         </div>

                         {/* DONE */}
                         {showDoneTasks && (
                            <div className="flex-1 flex flex-col bg-emerald-50/50 dark:bg-slate-900 rounded-2xl p-4 border border-emerald-100 dark:border-slate-800 shadow-sm animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-emerald-100 dark:border-slate-800">
                                    <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> {t.done}
                                    </h3>
                                    <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-300">{getTasksByStatus('done').length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                    {getTasksByStatus('done').map(task => {
                                        const subj = subjects.find(s => s.id === task.subjectId);
                                        return (
                                        <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 opacity-60 hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">COMPLETED</span>
                                            </div>
                                            <p className="font-medium text-gray-500 dark:text-emerald-400 line-through mb-1">{task.title}</p>
                                            <p className="text-xs text-gray-400 dark:text-emerald-500 mb-3">{subj?.name}</p>
                                            <div className="flex items-center justify-end text-xs text-gray-500 dark:text-emerald-400">
                                                <button onClick={() => moveTask(task, 'doing')} className="text-gray-400 hover:text-blue-500">&larr; Undo</button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                         )}
                    </div>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;