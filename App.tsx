import React, { useState, useEffect, useRef } from 'react';
import { Subject, Task, Note, Resource, Language } from './types';
import { INITIAL_SUBJECTS, INITIAL_TASKS, INITIAL_NOTES, INITIAL_RESOURCES, COLORS, ICONS, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import SubjectDetail from './components/SubjectDetail';
import SearchManager from './components/SearchManager';
import { LayoutGrid, Search, Moon, Sun, Database, HardDrive, Download, X, GraduationCap, BookOpen, Menu, ChevronLeft, ChevronRight, Trash2, MoreHorizontal, ArrowUp, ArrowDown, PenSquare, GripVertical, ListFilter, Plus, CheckCircle, FileText, Palette } from 'lucide-react';

function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

const IconPicker = ({ selected, onSelect }: { selected: string, onSelect: (i: string) => void }) => {
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
        </div>
    )
}

const SubjectDrawer = ({ isOpen, onClose, onSave, lang, initialData }: any) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    
    // Color Logic
    const [selectedColor, setSelectedColor] = useState('bg-blue-500'); 
    const [showCustomColor, setShowCustomColor] = useState(false);
    const [customHex, setCustomHex] = useState('#3b82f6'); // Default blue hex

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
                
                // Check if color is hex or class
                if (initialData.color.startsWith('#')) {
                    setShowCustomColor(true);
                    setCustomHex(initialData.color);
                    setSelectedColor('custom');
                } else {
                    // Strip opacity if present for backward compatibility
                    const cleanColor = initialData.color.split('/')[0];
                    setSelectedColor(baseColors.includes(cleanColor) ? cleanColor : 'bg-blue-500');
                    setShowCustomColor(false);
                }
            } else {
                setName('');
                setDesc('');
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
                createdAt: initialData ? initialData.createdAt : new Date().toISOString()
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.icon}</label>
                    <IconPicker selected={icon} onSelect={setIcon} />
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">{t.color}</label>
                    
                    {/* Base Color Selection */}
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

                    {/* Custom Color Panel */}
                    {showCustomColor && (
                        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm border border-gray-200 dark:border-slate-600 flex-shrink-0">
                                    <input 
                                        type="color" 
                                        value={customHex} 
                                        onChange={(e) => setCustomHex(e.target.value)}
                                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1 block">Mã màu (Hex)</label>
                                    <div className="flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2">
                                        <span className="text-gray-400 mr-2">#</span>
                                        <input 
                                            value={customHex.replace('#', '')}
                                            onChange={(e) => setCustomHex(`#${e.target.value}`)}
                                            className="w-full outline-none bg-transparent text-sm font-mono text-gray-800 dark:text-white uppercase"
                                            maxLength={6}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Box */}
                    <div className={`mt-4 h-14 rounded-xl w-full flex items-center justify-center shadow-sm transition-all duration-200 relative overflow-hidden text-white font-bold text-lg ${!showCustomColor ? selectedColor : ''}`}
                         style={{ backgroundColor: showCustomColor ? customHex : undefined }}
                    >
                        Preview Title
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                <button 
                    onClick={handleSubmit}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none"
                >
                    {t.save}
                </button>
            </div>
        </div>
        </>
    )
}

const StorageView = ({ subjects, tasks, notes, onDeleteSubject, onDeleteTask, onDeleteNote }: any) => {
    // ... (No changes to StorageView)
    const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'tasks' | 'notes'>('overview');
    const [size, setSize] = useState(0);
    const LIMIT = 5 * 1024 * 1024; 

    useEffect(() => {
        const data = JSON.stringify(localStorage);
        setSize(new Blob([data]).size);
    }, [subjects, tasks, notes]);

    const percent = (size / LIMIT) * 100;

    const downloadBackup = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            subjects, tasks, notes
        }));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `study_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    const tabs = [
        { id: 'overview', label: 'Tổng quan' },
        { id: 'subjects', label: 'Môn học' },
        { id: 'tasks', label: 'Công việc' },
        { id: 'notes', label: 'Ghi chú' },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 p-8 overflow-y-auto transition-colors">
             <div className="max-w-4xl mx-auto w-full">
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
                    <div className="bg-white dark:bg-slate-900/60 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 mb-8 backdrop-blur-sm">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <HardDrive size={40} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-2">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Local Storage</h3>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{(size / 1024).toFixed(2)} KB / 5 MB</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-950 h-4 rounded-full overflow-hidden border border-gray-200 dark:border-slate-800">
                                    <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full" style={{ width: `${Math.max(percent, 1)}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500/70 mt-2">Dữ liệu được lưu trên trình duyệt của bạn.</p>
                            </div>
                        </div>
                        <button onClick={downloadBackup} className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition">
                            <Download size={20} /> Sao lưu dữ liệu (Backup)
                        </button>
                    </div>
                )}
             </div>
        </div>
    )
}

// Quick Create Drawer (Slide Bar)
const QuickCreateDrawer = ({ subjects, isOpen, onClose, onSave }: { subjects: Subject[], isOpen: boolean, onClose: () => void, onSave: (type: 'task' | 'note', subjectId: string, content: string) => void }) => {
    const [type, setType] = useState<'task' | 'note'>('note');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if(isOpen) {
            setContent('');
            setSelectedSubjectId('');
            setType('note');
        }
    }, [isOpen]);

    if(!isOpen) return null;

    const handleSave = () => {
        if(selectedSubjectId && content.trim()) {
            onSave(type, selectedSubjectId, content);
            onClose();
        }
    }

    return (
        <>
        <div className="fixed inset-0 bg-black/30 z-[100] transition-opacity" onClick={onClose}></div>
        <div className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-slate-900 z-[110] shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
                    <Plus className="text-emerald-500" size={20}/> Note ngay
                </h3>
                <button onClick={onClose}><X className="text-gray-400 hover:text-red-500"/></button>
            </div>
            
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  {/* Segmentation Control */}
                  <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button 
                          onClick={() => setType('note')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition ${type === 'note' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`}
                      >
                          <FileText size={16}/> Ghi chú
                      </button>
                      <button 
                          onClick={() => setType('task')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition ${type === 'task' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`}
                      >
                          <CheckCircle size={16}/> Task
                      </button>
                  </div>

                  {/* Subject Selection */}
                  <div>
                       <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Chọn môn học</label>
                       <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                          {subjects.filter(s => !s.isArchived).map(s => {
                              const isCustomColor = s.color.startsWith('#');
                              const dotStyle = isCustomColor ? { backgroundColor: s.color } : {};
                              const dotClass = isCustomColor ? '' : s.color;
                              
                              return (
                              <button
                                  key={s.id}
                                  onClick={() => setSelectedSubjectId(s.id)}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition ${selectedSubjectId === s.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500' : 'border-gray-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-slate-600'}`}
                              >
                                  <div className={`w-3 h-3 rounded-full ${dotClass}`} style={dotStyle}></div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">{s.name}</span>
                              </button>
                          )})}
                       </div>
                  </div>

                  {/* Input Content */}
                  <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">{type === 'note' ? 'Tiêu đề ghi chú' : 'Tên công việc'}</label>
                      <input 
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSave()}
                          className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900 transition dark:bg-slate-950 dark:text-white"
                          placeholder={type === 'note' ? 'Nhập tiêu đề...' : 'Nhập tên task...'}
                          autoFocus
                      />
                  </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900">
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
  const [subjects, setSubjects] = useStickyState<Subject[]>(INITIAL_SUBJECTS, 'smartstudy_subjects');
  const [tasks, setTasks] = useStickyState<Task[]>(INITIAL_TASKS, 'smartstudy_tasks');
  const [notes, setNotes] = useStickyState<Note[]>(INITIAL_NOTES, 'smartstudy_notes');
  const [resources, setResources] = useStickyState<Resource[]>(INITIAL_RESOURCES, 'smartstudy_resources');

  const [currentView, setCurrentView] = useState<'dashboard' | 'search' | 'storage' | string>('dashboard'); 
  const [openedNoteId, setOpenedNoteId] = useState<string | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [darkMode, setDarkMode] = useStickyState<boolean>(false, 'smartstudy_darkmode');
  const [lang, setLang] = useStickyState<Language>('vi', 'smartstudy_lang');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useStickyState<boolean>(false, 'smartstudy_sidebar_collapsed');
  
  // Sidebar Sub-menu Logic (Now a secondary sidebar)
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false); 
  const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);

  // Storage calculation for Sidebar
  const [storageUsed, setStorageUsed] = useState('0.00');
  useEffect(() => {
      let total = 0;
      for(let x in localStorage) {
          if(localStorage.hasOwnProperty(x)) total += ((localStorage[x].length + x.length) * 2);
      }
      setStorageUsed((total / 1024 / 1024).toFixed(2));
  }, [subjects, tasks, notes, resources]); // Re-calc when data changes

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const activeSubject = subjects.find(s => s.id === currentView);
  const t = TRANSLATIONS[lang];

  // Drag and Drop Logic
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

  const handleAddSubject = (subject: Subject) => setSubjects([...subjects, subject]);
  
  const handleUpdateSubject = (updatedSubject: Subject) => {
      setSubjects(prev => prev.map(s => s.id === updatedSubject.id ? updatedSubject : s));
  };

  const handleDeleteSubject = (id: string) => {
      setSubjects(prev => prev.filter(s => s.id !== id));
      setTasks(prev => prev.filter(t => t.subjectId !== id));
      setNotes(prev => prev.filter(n => n.subjectId !== id));
      setResources(prev => prev.filter(r => r.subjectId !== id));
      if (currentView === id) setCurrentView('dashboard');
  }

  const handleArchiveSubject = (id: string) => {
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, isArchived: !s.isArchived } : s));
  }
  
  const handleAddTask = (task: Task) => setTasks([...tasks, task]);
  const handleUpdateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const handleDeleteTask = (taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId));

  const handleAddNote = (note: Note) => setNotes([...notes, note]);
  const handleUpdateNote = (note: Note) => setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  const handleDeleteNote = (noteId: string) => setNotes(prev => prev.filter(n => n.id !== noteId));

  const handleAddResource = (res: Resource) => setResources([...resources, res]);
  const handleDeleteResource = (resId: string) => setResources(prev => prev.filter(r => r.id !== resId));

  const openAddModal = () => { setEditingSubject(null); setIsModalOpen(true); }
  const openEditModal = (subject: Subject) => { setEditingSubject(subject); setIsModalOpen(true); }

  const handleDirectOpenNote = (noteId: string, subjectId: string) => {
      setOpenedNoteId(noteId);
      setCurrentView(subjectId);
      setIsCreatingNote(false);
  }

  // Handle Quick Create Save
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
          setCurrentView(subjectId); // Navigate to subject
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
          setCurrentView(subjectId); // Navigate to subject
          // Small delay to ensure SubjectDetail mounts before opening note
          setTimeout(() => setOpenedNoteId(newNote.id), 100);
      }
  }

  const visibleSubjects = subjects.filter(s => !s.isArchived).slice(0, 4);
  const hiddenSubjects = subjects.filter(s => !s.isArchived).slice(4);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 text-slate-800 dark:text-slate-50 font-sans overflow-hidden transition-colors flex-row">
      
      {/* Main Sidebar */}
      <aside 
        className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 z-50 print:hidden relative shadow-sm`}
      >
        <div className={`p-6 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200 dark:shadow-none flex-shrink-0">
            <GraduationCap size={24} />
          </div>
          {!isSidebarCollapsed && <h1 className="font-bold text-xl tracking-tight text-gray-800 dark:text-white whitespace-nowrap overflow-hidden">StudyTask</h1>}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <button
              onClick={() => setShowQuickNoteModal(true)}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl transition-all font-bold whitespace-nowrap bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
          >
              <Plus size={24} strokeWidth={3} />
              {!isSidebarCollapsed && <span>Note ngay</span>}
          </button>

          {[ { id: 'dashboard', icon: LayoutGrid, label: t.dashboard }, { id: 'search', icon: Search, label: t.search } ].map(item => (
             <button 
                key={item.id}
                onClick={() => { setCurrentView(item.id); setIsCreatingNote(false); }}
                title={item.label}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap ${currentView === item.id ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
                <item.icon size={20} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
          
          <div className={`pt-6 pb-2 px-4 text-xs font-bold text-gray-400 dark:text-slate-500/70 uppercase tracking-wider ${isSidebarCollapsed ? 'text-center' : ''}`}>
             {!isSidebarCollapsed ? t.subjects : '---'}
          </div>

          <div className="space-y-1">
             {visibleSubjects.map(subject => {
                const Icon = ICONS[subject.icon] || BookOpen;
                return (
                    <div 
                        key={subject.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, subject.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, subject.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium group whitespace-nowrap cursor-pointer ${currentView === subject.id ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-300' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        onClick={() => { setCurrentView(subject.id); setIsCreatingNote(false); }}
                    >
                        <Icon size={18} />
                        {!isSidebarCollapsed && <span className="truncate max-w-[140px]">{subject.name}</span>}
                    </div>
                )
             })}
             
             {hiddenSubjects.length > 0 && (
                 <button
                    onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium group whitespace-nowrap text-gray-500 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 ${isSidebarCollapsed ? 'justify-center' : ''} ${isSubMenuOpen ? 'bg-gray-100 dark:bg-slate-800' : ''}`}
                 >
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
                        <span>Lưu trữ</span>
                        <span>{storageUsed} MB</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((parseFloat(storageUsed)/5)*100, 100)}%` }}></div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setCurrentView('storage')}
                title={t.storage}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-medium whitespace-nowrap ${currentView === 'storage' ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
                <Database size={20} />
                {!isSidebarCollapsed && <span>{t.storage}</span>}
            </button>

            <div className={`flex gap-2 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
                 <button onClick={() => setDarkMode(!darkMode)} className="flex-1 flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                    {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
                </button>
                <button onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')} className="flex-1 flex items-center justify-center p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 font-bold text-xs">
                    {lang === 'vi' ? 'VI' : 'EN'}
                </button>
            </div>
            
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-emerald-600 transition">
                 {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </div>
      </aside>

      {/* Secondary Sidebar (Full height "See More") */}
      {isSubMenuOpen && hiddenSubjects.length > 0 && (
          <div className="w-64 bg-gray-50 dark:bg-slate-900/80 border-r border-gray-100 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 animate-in slide-in-from-left-4 z-40 print:hidden backdrop-blur-md">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700 dark:text-white">Môn học khác</h3>
                  <button onClick={() => setIsSubMenuOpen(false)}><X size={18} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {hiddenSubjects.map(subject => {
                      const Icon = ICONS[subject.icon] || BookOpen;
                      return (
                          <div
                              key={subject.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, subject.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, subject.id)}
                              onClick={() => { setCurrentView(subject.id); setIsSubMenuOpen(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium whitespace-nowrap text-left cursor-pointer group ${currentView === subject.id ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                          >
                               <div className="opacity-0 group-hover:opacity-50 cursor-grab">
                                  <GripVertical size={14}/>
                               </div>
                              <Icon size={18} />
                              <span className="truncate">{subject.name}</span>
                          </div>
                      )
                  })}
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-slate-950 transition-colors">
        {currentView === 'dashboard' ? (
          <Dashboard 
            subjects={subjects} 
            tasks={tasks}
            notes={notes}
            resources={resources}
            onSelectSubject={setCurrentView}
            onAddSubject={openAddModal}
            onDeleteSubject={handleDeleteSubject}
            onArchiveSubject={handleArchiveSubject}
            onUpdateTask={handleUpdateTask}
            onUpdateSubject={openEditModal}
            lang={lang}
          />
        ) : currentView === 'search' ? (
           <SearchManager tasks={tasks} notes={notes} subjects={subjects} onSelectSubject={setCurrentView} onSelectNote={handleDirectOpenNote}/>
        ) : currentView === 'storage' ? (
            <StorageView subjects={subjects} tasks={tasks} notes={notes} onDeleteSubject={handleDeleteSubject} onDeleteTask={handleDeleteTask} onDeleteNote={handleDeleteNote}/>
        ) : activeSubject ? (
          <SubjectDetail 
            subject={activeSubject}
            tasks={tasks.filter(t => t.subjectId === activeSubject.id)}
            notes={notes.filter(n => n.subjectId === activeSubject.id)}
            resources={resources.filter(r => r.subjectId === activeSubject.id)}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onAddResource={handleAddResource}
            onDeleteResource={handleDeleteResource}
            onBack={() => setCurrentView('dashboard')}
            onEditSubject={() => openEditModal(activeSubject)}
            onArchiveSubject={() => handleArchiveSubject(activeSubject.id)}
            lang={lang}
            initialOpenNoteId={openedNoteId}
            isCreatingNote={isCreatingNote}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-emerald-600 flex-col">
              <span className="text-6xl mb-4">🤔</span>
              <p>{t.noSubjects}</p>
              <button onClick={() => setCurrentView('dashboard')} className="mt-4 text-emerald-600 dark:text-emerald-400 font-medium hover:underline">{t.back}</button>
          </div>
        )}
      </main>

      <SubjectDrawer 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(data: Subject) => {
            if (editingSubject) handleUpdateSubject(data); else handleAddSubject(data);
        }} 
        lang={lang}
        initialData={editingSubject}
      />

      <QuickCreateDrawer 
        subjects={subjects}
        isOpen={showQuickNoteModal}
        onClose={() => setShowQuickNoteModal(false)}
        onSave={handleQuickCreate}
      />
    </div>
  );
};

export default App;