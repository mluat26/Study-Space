import React, { useState, useEffect, useRef } from 'react';
import { Subject, Task, Note, Resource, Language } from '../types';
import { Plus, CheckCircle, Circle, FileText, Link as LinkIcon, Trash2, ArrowLeft, X, Printer, Calendar, ArrowRight, GripVertical, AlertCircle, PlayCircle, FolderOpen, Video, Copy, Wand2, PenTool, Download, CheckSquare, Square, File, UploadCloud, Clock, Save, FilePlus, Sparkles, Archive, Search, ExternalLink, Mic, StopCircle, FileAudio, AlignLeft, Eye, EyeOff, MessageSquare, Headphones, ChevronRight, Play, Pause, Music } from 'lucide-react';
import { ICONS, TRANSLATIONS } from '../constants';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';
import AudioVisualizer from './AudioVisualizer';

interface SubjectDetailProps {
  subject: Subject;
  tasks: Task[];
  notes: Note[];
  resources: Resource[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void; 
  onDeleteTask: (taskId: string) => void;
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onAddResource: (res: Resource) => void;
  onDeleteResource: (resId: string) => void;
  onBack?: () => void;
  onEditSubject?: (subject: Subject) => void;
  onArchiveSubject?: (id: string) => void;
  lang: Language;
  initialOpenNoteId?: string | null;
  isCreatingNote?: boolean; 
}

interface AudioAttachment {
    id: string;
    url: string; // Base64 or URL
    name: string;
    createdAt: string;
}

const SubjectDetail: React.FC<SubjectDetailProps> = ({
  subject, tasks, notes, resources,
  onAddTask, onUpdateTask, onDeleteTask,
  onAddNote, onUpdateNote, onDeleteNote,
  onAddResource, onDeleteResource, onBack, onEditSubject, onArchiveSubject, lang, initialOpenNoteId, isCreatingNote
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'resources'>('tasks');
  const [resourceFilter, setResourceFilter] = useState<'All' | 'Link' | 'File' | 'Audio'>('All');
  
  const t = TRANSLATIONS[lang];
  
  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showPdfDrawer, setShowPdfDrawer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Note Editor State & Refs
  const editorRef = useRef<RichTextEditorRef>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // AI Sidebar
  const [isAudioSidebarOpen, setIsAudioSidebarOpen] = useState(false); // Audio Sidebar
  
  // Resource Preview State
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [drawerSearchTerm, setDrawerSearchTerm] = useState('');

  // Form State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<'High'|'Medium'|'Low'>('Medium');

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [audioAttachments, setAudioAttachments] = useState<AudioAttachment[]>([]); // Separated Audio State
  const [isNoteDirty, setIsNoteDirty] = useState(false); 
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null); // For playing

  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resType, setResType] = useState<'Link' | 'File' | 'Audio'>('Link');
  const [resTranscription, setResTranscription] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null); // State for visualizer
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // PDF Export State
  const [selectedPdfNotes, setSelectedPdfNotes] = useState<string[]>([]);

  // Open note if ID is passed
  useEffect(() => {
    if (initialOpenNoteId) {
        const noteToOpen = notes.find(n => n.id === initialOpenNoteId);
        if (noteToOpen) {
            setActiveTab('notes');
            openNote(noteToOpen);
        }
    }
  }, [initialOpenNoteId]);

  useEffect(() => {
      if (isCreatingNote) {
          setActiveTab('notes');
          openNote(null);
      }
  }, [isCreatingNote]);

  // Clean up recording on unmount or modal close
  useEffect(() => {
      return () => {
          stopRecordingInternal();
      };
  }, []);

  const stopRecordingInternal = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setRecordingStream(null);
  }

  // --- HTML Parsing Logic for Audio ---
  const parseNoteContent = (htmlContent: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const audios: AudioAttachment[] = [];

      // Find hidden audio data divs (New format)
      const hiddenAudioDivs = doc.querySelectorAll('.smartstudy-audio-data');
      hiddenAudioDivs.forEach(div => {
          const url = div.getAttribute('data-url');
          const name = div.getAttribute('data-name') || 'Bản ghi âm';
          const createdAt = div.getAttribute('data-created') || new Date().toISOString();
          const id = div.getAttribute('id') || Date.now().toString() + Math.random();
          if (url) {
              audios.push({ id, url, name, createdAt });
              div.remove(); // Remove from editor content
          }
      });

      // Optional: Clean up legacy <audio> tags if you want to migrate them
      // For now, let's leave legacy tags alone or they will show in editor.
      // Or we can aggressive parse:
      /*
      const legacyAudios = doc.querySelectorAll('audio');
      legacyAudios.forEach((audio, idx) => {
          const src = audio.getAttribute('src');
          if (src && src.startsWith('data:')) {
             const id = 'legacy-' + idx;
             audios.push({ id, url: src, name: 'Ghi âm cũ ' + (idx + 1), createdAt: new Date().toISOString() });
             // Remove the parent container if it looks like our old wrapper
             if (audio.parentElement && audio.parentElement.classList.contains('bg-sky-50')) {
                 audio.parentElement.remove();
             } else {
                 audio.remove();
             }
          }
      });
      */

      return {
          cleanedContent: doc.body.innerHTML,
          audios
      };
  };

  const openNote = (note: Note | null) => {
      setEditingNote(note);
      
      if (note) {
          setNoteTitle(note.title);
          // Parse content to separate audio
          const { cleanedContent, audios } = parseNoteContent(note.content);
          setNoteContent(cleanedContent);
          setAudioAttachments(audios);
          // Auto open audio sidebar if there are audios
          if (audios.length > 0) setIsAudioSidebarOpen(true);
          else setIsAudioSidebarOpen(false);
      } else {
          setNoteTitle('');
          setNoteContent('');
          setAudioAttachments([]);
          setIsAudioSidebarOpen(false);
      }
      
      setIsNoteDirty(false);
      setShowNoteModal(true);
  }

  const openAddTaskModal = () => {
      setEditingTask(null);
      setNewTaskTitle('');
      setNewTaskDate(new Date().toISOString().split('T')[0]);
      setNewTaskPriority('Medium');
      setShowTaskModal(true);
  }

  const openEditTaskModal = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskDate(task.dueDate);
      setNewTaskPriority(task.priority);
      setShowTaskModal(true);
  }

  // Smart Input Parser
  const parseSmartInput = (input: string) => {
      const regex = /(.+?)-(\d{3,8})(?:-(\d))?$/;
      const match = input.match(regex);
      if (match) {
          const title = match[1].trim();
          const dateStr = match[2];
          const priorityCode = match[3];
          let parsedDate = new Date();
          const currentYear = parsedDate.getFullYear();
          let day, month, year;
          if (dateStr.length === 4) {
              day = parseInt(dateStr.substring(0, 2));
              month = parseInt(dateStr.substring(2, 4)) - 1; 
              year = currentYear;
          } else if (dateStr.length === 8) {
              day = parseInt(dateStr.substring(0, 2));
              month = parseInt(dateStr.substring(2, 4)) - 1;
              year = parseInt(dateStr.substring(4, 8));
          } else {
              return { title: input, date: newTaskDate, priority: newTaskPriority };
          }
          const dateObj = new Date(year, month, day);
          const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : newTaskDate;
          let priority: 'Low' | 'Medium' | 'High' = 'Medium';
          if (priorityCode === '1') priority = 'Low';
          if (priorityCode === '3') priority = 'High';
          return { title, date: formattedDate, priority };
      }
      return { title: input, date: newTaskDate, priority: newTaskPriority };
  };

  const handleSaveTask = () => {
    if(newTaskTitle.trim()) {
        const { title, date, priority } = editingTask 
            ? { title: newTaskTitle, date: newTaskDate, priority: newTaskPriority } 
            : parseSmartInput(newTaskTitle);
            
        if (editingTask) {
            onUpdateTask({ ...editingTask, title: title, dueDate: date, priority: priority });
        } else {
            const newTask: Task = { 
                id: Date.now().toString(), 
                subjectId: subject.id, 
                title: title, 
                status: 'todo', 
                dueDate: date, 
                priority: priority 
            };
            onAddTask(newTask);
        }
        setShowTaskModal(false);
    }
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSaveTask();
      }
  }

  const handleSaveNote = () => {
      // Auto-title if empty
      let finalTitle = noteTitle.trim();
      let content = noteContent;
      
      // Get latest content from ref if available
      if(editorRef.current) {
          content = editorRef.current.getContent();
      }

      // Basic strip HTML for checking content existence
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      if (!finalTitle && plainText.trim()) {
          finalTitle = plainText.split(/\s+/).slice(0, 5).join(' ') + (plainText.length > 30 ? '...' : '');
      }
      if(!finalTitle) finalTitle = "Untitled Note";
      
      // --- MERGE AUDIO ATTACHMENTS INTO CONTENT ---
      // We append hidden divs containing the base64 data so it's self-contained in the note content string
      // independent of any other database tables.
      let audioHtml = '';
      if (audioAttachments.length > 0) {
          audioHtml = audioAttachments.map(audio => `
            <div 
                id="${audio.id}" 
                class="smartstudy-audio-data" 
                data-url="${audio.url}" 
                data-name="${audio.name}" 
                data-created="${audio.createdAt}" 
                style="display:none;"
            ></div>
          `).join('');
      }
      // Be careful not to duplicate if we are re-saving
      // The parseNoteContent removed them from `content` state, so appending is safe.
      const finalContent = content + audioHtml;

      setNoteTitle(finalTitle);
      const timestamp = new Date().toISOString();

      if (editingNote) {
            const updatedNote = { ...editingNote, title: finalTitle, content: finalContent, lastModified: timestamp };
            onUpdateNote(updatedNote);
            setEditingNote(updatedNote); 
      } else {
            const newNote = {
                id: Date.now().toString(),
                subjectId: subject.id,
                title: finalTitle,
                content: finalContent,
                lastModified: timestamp
            };
            onAddNote(newNote);
            setEditingNote(newNote); 
      }
      setIsNoteDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCloseNoteModal = () => {
      if (isNoteDirty) {
          if (!window.confirm("Bạn chưa lưu các thay đổi. Bạn có chắc chắn muốn thoát?")) {
              return;
          }
      }
      stopRecordingInternal();
      setIsNoteDirty(false);
      setShowNoteModal(false);
  }

  // --- Audio Recording Logic ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setRecordingStream(stream); 
          
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  const base64data = reader.result as string;
                  const timestamp = new Date();
                  const timeString = timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  
                  // 1. Add to Audio List State (No longer inserting into Editor directly)
                  const newAudio: AudioAttachment = {
                      id: Date.now().toString(),
                      url: base64data,
                      name: `Ghi âm ${timeString}`,
                      createdAt: timestamp.toISOString()
                  };
                  
                  setAudioAttachments(prev => [newAudio, ...prev]);
                  setIsAudioSidebarOpen(true); // Open sidebar to show result
                  setIsNoteDirty(true); // Mark as dirty

                  // 2. Save as Resource (Back up)
                  const autoTitle = `Ghi âm: ${noteTitle || 'Ghi chú'} (${timeString})`;
                  onAddResource({
                      id: Date.now().toString(),
                      subjectId: subject.id,
                      title: autoTitle,
                      type: 'Audio',
                      url: base64data
                  });
              }

              stream.getTracks().forEach(track => track.stop());
              setRecordingStream(null);
          };

          mediaRecorder.start();
          setIsRecording(true);
          setRecordingTime(0);
          timerRef.current = window.setInterval(() => {
              setRecordingTime(prev => prev + 1);
          }, 1000);

      } catch (err) {
          console.error("Error accessing microphone:", err);
          alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRecording(false);
      }
  };

  const deleteAudioAttachment = (id: string) => {
      if (window.confirm('Xóa bản ghi âm này?')) {
          setAudioAttachments(prev => prev.filter(a => a.id !== id));
          setIsNoteDirty(true);
          if (activeAudioId === id) setActiveAudioId(null);
      }
  };

  // --- AI Summary Helper ---
  const generatePrompt = () => {
      if (!editorRef.current) return '';
      const content = editorRef.current.getPlainText();
      return `Tóm tắt nội dung sau đây một cách ngắn gọn, súc tích (khoảng 60-80 từ) dưới dạng bullet points hoặc đoạn văn ngắn:\n\n"${content}"`;
  };

  const handleCopyPrompt = () => {
      const prompt = generatePrompt();
      navigator.clipboard.writeText(prompt);
      alert("Đã copy Prompt! Hãy dán vào AI.");
  };

  const handleApplySummary = (text: string) => {
      if (editorRef.current) {
           editorRef.current.setSummary(text);
           setIsSidebarOpen(false);
      }
  };

  const handleSaveResource = () => {
      if((resTitle.trim() && resUrl.trim()) || (resType === 'Audio' && resUrl)) {
          onAddResource({
              id: Date.now().toString(),
              subjectId: subject.id,
              title: resTitle || 'Tài liệu mới',
              type: resType,
              url: resUrl,
              transcription: resType === 'Audio' ? resTranscription : undefined
          });
          setResTitle(''); 
          setResUrl('');
          setResTranscription('');
          setResType('Link');
          setShowResourceModal(false);
      }
  }

  const togglePdfNote = (id: string) => {
      setSelectedPdfNotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const handlePrint = () => {
      const originalTitle = document.title;
      document.title = `${subject.name} - Study Notes`;
      window.print();
      document.title = originalTitle;
  }
  
  const IconComp = ICONS[subject.icon] || ICONS['Book'];

  const toggleTaskStatus = (task: Task) => {
      const nextStatus = task.status === 'done' ? 'todo' : 'done';
      onUpdateTask({ ...task, status: nextStatus });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      const pMap = { High: 3, Medium: 2, Low: 1 };
      if (pMap[a.priority] > pMap[b.priority]) return -1;
      if (pMap[a.priority] < pMap[b.priority]) return 1;
      return a.dueDate.localeCompare(b.dueDate);
  });
  
  const filteredResources = resources.filter(r => resourceFilter === 'All' || r.type === resourceFilter);
  const notesToPrint = notes.filter(n => selectedPdfNotes.includes(n.id));
  const estimatedPages = Math.ceil((tasks.length * 50 + notesToPrint.reduce((acc, n) => acc + n.content.length/2, 0)) / 3000) || 1;
  const estimatedSize = (notesToPrint.length * 0.15 + 0.2).toFixed(2);

  const filteredDrawerResources = resources.filter(r => r.title.toLowerCase().includes(drawerSearchTerm.toLowerCase()));

  // Drag and Drop simulation for Resources
  const handleDropResource = (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
          const file = files[0];
          setResTitle(file.name); // Auto-name
          setResUrl('#local-file');
          setResType('File');
          setShowResourceModal(true);
      }
  }

  // Handle URL change for auto-naming
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setResUrl(url);
      // Simple auto-name if title is empty
      if (!resTitle && url.length > 5) {
          try {
              const urlObj = new URL(url);
              setResTitle(urlObj.hostname + (urlObj.pathname.length > 1 ? urlObj.pathname : ''));
          } catch {
              // invalid url, ignore
          }
      }
  }

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to determine text color based on background (basic)
  const isCustomColor = subject.color.startsWith('#');
  const headerStyle = isCustomColor ? { backgroundColor: subject.color } : {};
  const headerClass = isCustomColor ? '' : subject.color;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-slate-950 relative transition-colors">
      <style>{`
        @media print {
            body > * { display: none !important; }
            #print-area, #print-area * { display: block !important; visibility: visible; }
            #print-area { position: fixed; left: 0; top: 0; width: 100%; min-height: 100vh; padding: 20px; background: white; color: black; z-index: 9999; }
            .no-print { display: none !important; }
            * { color: black !important; background: white !important; border-color: #ddd !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Modern Full-Color Header */}
      <div 
        className={`p-8 relative overflow-hidden flex-shrink-0 no-print transition-all duration-300 ${headerClass}`}
        style={headerStyle}
      >
         {/* Big Background Icon */}
         <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 pointer-events-none">
             <IconComp size={300} className="text-white" />
         </div>

         <div className="relative z-10 flex flex-col gap-6">
            <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white transition w-fit">
                <ArrowLeft size={20} /> <span className="font-medium">{t.back}</span>
            </button>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">{subject.name}</h1>
                    <p className="text-white/80 text-lg max-w-2xl">{subject.description}</p>
                    
                    <div className="flex items-center gap-4 mt-6 text-white/70 text-sm font-medium">
                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm"><Clock size={14}/> Created: {subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        <span className="flex items-center gap-1.5"><CheckCircle size={14}/> {tasks.length} Tasks</span>
                        <span className="flex items-center gap-1.5"><FileText size={14}/> {notes.length} Notes</span>
                        <span className="flex items-center gap-1.5"><LinkIcon size={14}/> {resources.length} Docs</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => onEditSubject && onEditSubject(subject)} 
                        className="flex items-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10"
                        title="Chỉnh sửa môn học"
                    >
                        <PenTool size={18} />
                    </button>
                    <button 
                        onClick={() => onArchiveSubject && onArchiveSubject(subject.id)} 
                        className="flex items-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10"
                        title="Lưu trữ"
                    >
                        <Archive size={18} />
                    </button>
                    <button onClick={() => { setSelectedPdfNotes(notes.map(n=>n.id)); setShowPdfDrawer(true); }} className="flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10">
                        <Printer size={18} /> {t.exportPdf}
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-8 space-x-8 sticky top-0 z-20 flex-shrink-0 shadow-sm">
        {['tasks', 'notes', 'resources'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-4 px-1 font-medium capitalize transition-all border-b-2 text-lg ${
              activeTab === tab 
                ? `border-emerald-500 text-emerald-600 dark:text-emerald-400` 
                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'tasks' ? t.tasks : tab === 'notes' ? t.notes : t.resources}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="subject-content flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-slate-950/50 no-print">
        {/* LIST VIEW for TASKS */}
        {activeTab === 'tasks' && (
          <div className="max-w-5xl mx-auto h-full flex flex-col">
             <div className="flex justify-between items-center mb-6 flex-shrink-0">
                 <h2 className="text-xl font-bold dark:text-white">{t.tasks}</h2>
                 <button 
                    onClick={openAddTaskModal}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-medium shadow-md shadow-emerald-200 dark:shadow-none"
                 >
                     <Plus size={20} /> {t.addTask}
                 </button>
             </div>

             <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col backdrop-blur-sm">
                 {sortedTasks.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                         <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                             <AlertCircle size={32}/>
                         </div>
                         <p>Chưa có công việc nào.</p>
                     </div>
                 ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {sortedTasks.map(task => (
                            <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition group ${task.status === 'done' ? 'opacity-60 bg-gray-50 dark:bg-slate-900/50' : ''}`}>
                                <button 
                                    onClick={() => toggleTaskStatus(task)}
                                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                        ${task.status === 'done' 
                                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                                            : 'border-gray-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'}`}
                                >
                                    <CheckCircle size={14} fill="currentColor" className={task.status === 'done' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-lg font-medium truncate ${task.status === 'done' ? 'line-through text-gray-500 dark:text-slate-500' : 'text-gray-800 dark:text-white'}`}>
                                        {task.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                                        <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : ''}`}>
                                            <Calendar size={14}/> {task.dueDate}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            task.priority === 'High' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 
                                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                         }`}>
                                             {task.priority}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => openEditTaskModal(task)} className="p-2 text-gray-400 hover:text-emerald-500"><PenTool size={18}/></button>
                                     <button onClick={() => onDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
             </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold dark:text-white">{t.notes}</h2>
                 <button 
                    onClick={() => openNote(null)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 dark:shadow-none"
                 >
                     <Plus size={20} /> {t.addNote}
                 </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map(note => (
                    <div 
                        key={note.id} 
                        onClick={() => openNote(note)}
                        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative flex flex-col h-72"
                    >
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-xl line-clamp-1">{note.title}</h3>
                        <div 
                            className="text-gray-600 dark:text-slate-300 text-base line-clamp-6 mb-4 flex-1 whitespace-pre-wrap leading-relaxed prose dark:prose-invert prose-sm max-w-none overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                        <div className="flex justify-between items-center mt-auto border-t border-gray-100 dark:border-slate-800 pt-3">
                            <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(note.lastModified).toLocaleDateString()}</span>
                        </div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* RESOURCES TAB (Unchanged from original) */}
        {activeTab === 'resources' && (
          <div className="max-w-5xl mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <h2 className="text-xl font-bold dark:text-white">{t.resources}</h2>
                 <div className="flex items-center gap-4">
                     <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
                         {(['All', 'Link', 'File', 'Audio'] as const).map(type => (
                             <button
                                key={type}
                                onClick={() => setResourceFilter(type)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${resourceFilter === type ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300'}`}
                             >
                                 {type}
                             </button>
                         ))}
                     </div>
                     <button onClick={() => setShowResourceModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 shadow-md">
                         <LinkIcon size={20} /> {t.addResource}
                     </button>
                 </div>
             </div>
             
             {/* Drag and Drop Placeholder */}
             <div 
                className="mb-6 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropResource}
                onClick={() => setShowResourceModal(true)}
             >
                 <UploadCloud size={48} className="mb-2 text-gray-300 dark:text-slate-600"/>
                 <p className="font-medium">Kéo thả tài liệu vào đây hoặc click để thêm</p>
             </div>

             <div className="grid gap-4">
                 {filteredResources.map(res => {
                     let ResIcon = LinkIcon;
                     let iconColor = 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
                     if (res.type === 'File') { ResIcon = FileText; iconColor = 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'; } 
                     else if (res.type === 'Audio') { ResIcon = FileAudio; iconColor = 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'; }

                     return (
                     <div 
                        key={res.id} 
                        onClick={() => { setPreviewResource(res); setDrawerSearchTerm(''); }}
                        className="p-5 flex items-center justify-between group bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition shadow-sm backdrop-blur-sm cursor-pointer"
                     >
                         <div className="flex items-center gap-5 overflow-hidden">
                             <div className={`${iconColor} p-4 rounded-xl`}>
                                 <ResIcon size={24} />
                             </div>
                             <div className="min-w-0">
                                 <div className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 block truncate transition-colors">
                                     {res.title}
                                 </div>
                                 <p className="text-sm text-gray-400 mt-1 truncate max-w-xl">
                                     {res.type === 'Audio' ? 'Audio Recording' : res.url}
                                 </p>
                             </div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); onDeleteResource(res.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-2">
                             <Trash2 size={20} />
                         </button>
                     </div>
                 )})}
             </div>
          </div>
        )}
      </div>

      {/* NOTE MODAL */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col no-print animate-in fade-in duration-200 h-full overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center shadow-sm bg-white dark:bg-slate-900 flex-shrink-0 relative">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={handleCloseNoteModal} className="text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 max-w-2xl">
                         <input 
                            value={noteTitle}
                            onChange={e => {
                                setNoteTitle(e.target.value);
                                setIsNoteDirty(true);
                            }}
                            className="text-lg font-bold outline-none text-gray-800 dark:text-white placeholder-gray-300 bg-transparent w-full"
                            placeholder="Tiêu đề (Tự động nếu để trống)"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                            <span>{subject.name}</span>
                            <span>•</span>
                            <span>{editingNote ? `Sửa: ${new Date(editingNote.lastModified).toLocaleDateString()}` : 'Ghi chú mới'}</span>
                            {isNoteDirty && <span className="text-orange-500 font-semibold italic">• Unsaved</span>}
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2 items-center">
                    {saveSuccess && <span className="text-green-500 text-sm font-bold animate-pulse flex items-center gap-1 mr-2"><CheckCircle size={14}/> Saved</span>}
                    
                    {/* Header Buttons */}
                    <button 
                        onClick={startRecording}
                        disabled={isRecording}
                        className={`p-2 rounded-lg transition flex items-center justify-center gap-2 ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                        title="Ghi âm"
                    >
                        <Mic size={18}/>
                    </button>

                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition border border-emerald-100 dark:border-emerald-800/50"
                        title="AI Summary"
                    >
                        <Sparkles size={18} />
                    </button>

                    {/* New Audio List Toggle */}
                    <button 
                        onClick={() => setIsAudioSidebarOpen(!isAudioSidebarOpen)}
                        className={`p-2 rounded-lg transition border flex items-center gap-1 ${isAudioSidebarOpen || audioAttachments.length > 0 ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800' : 'bg-white dark:bg-slate-800 text-gray-500 border-transparent hover:bg-gray-100'}`}
                        title="Danh sách ghi âm"
                    >
                        <Headphones size={18} />
                        {audioAttachments.length > 0 && <span className="text-xs font-bold">{audioAttachments.length}</span>}
                    </button>

                    <button onClick={handleSaveNote} className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-md text-sm flex items-center gap-2 ml-2">
                         <Save size={16}/> {t.save}
                    </button>
                </div>
            </div>
            
            <div className="flex-1 p-0 flex bg-gray-50 dark:bg-slate-950 overflow-hidden relative">
                {/* Main Editor Area */}
                <div className="flex-1 w-full p-4 md:p-6 overflow-hidden flex flex-col transition-all duration-300">
                     <RichTextEditor 
                        ref={editorRef}
                        initialContent={noteContent}
                        onChange={(content) => {
                            setNoteContent(content);
                            setIsNoteDirty(true);
                        }}
                        placeholder="Bắt đầu nhập nội dung ghi chú..."
                        onSave={handleSaveNote}
                    />
                </div>

                {/* NEW Audio List Sidebar */}
                {isAudioSidebarOpen && (
                    <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300 shadow-xl z-20">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Headphones size={18} className="text-sky-500"/> Bản ghi âm
                            </h3>
                            <button onClick={() => setIsAudioSidebarOpen(false)}><X size={18} className="text-gray-400 hover:text-red-500"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-slate-950/30">
                            {audioAttachments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 dark:text-slate-600 flex flex-col items-center">
                                    <Mic size={32} className="mb-2 opacity-20"/>
                                    <p className="text-sm">Chưa có bản ghi nào.</p>
                                    <button onClick={startRecording} className="mt-2 text-xs text-emerald-600 font-bold hover:underline">Ghi âm ngay</button>
                                </div>
                            ) : (
                                audioAttachments.map((audio) => (
                                    <div key={audio.id} className={`bg-white dark:bg-slate-800 rounded-xl border transition-all overflow-hidden ${activeAudioId === audio.id ? 'border-sky-500 ring-1 ring-sky-500 shadow-md' : 'border-gray-200 dark:border-slate-700 hover:border-sky-300'}`}>
                                        <div 
                                            className="p-3 flex items-center gap-3 cursor-pointer"
                                            onClick={() => setActiveAudioId(activeAudioId === audio.id ? null : audio.id)}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activeAudioId === audio.id ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'}`}>
                                                {activeAudioId === audio.id ? <Pause size={14} fill="currentColor"/> : <Play size={14} fill="currentColor" className="ml-0.5"/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${activeAudioId === audio.id ? 'text-sky-700 dark:text-sky-300' : 'text-gray-700 dark:text-slate-300'}`}>{audio.name}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(audio.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(audio.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteAudioAttachment(audio.id); }}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                        
                                        {/* Expandable Player */}
                                        {activeAudioId === audio.id && (
                                            <div className="px-3 pb-3 pt-0 bg-sky-50/50 dark:bg-slate-800/50 animate-in slide-in-from-top-2">
                                                <audio controls src={audio.url} className="w-full h-8 mt-2 custom-audio" autoPlay />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Minimized Recorder Popup (Floating inside modal) */}
                {isRecording && (
                    <div className="absolute bottom-6 right-6 z-30 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 animate-in slide-in-from-bottom-2 fade-in duration-300 flex items-center gap-3 min-w-[280px]">
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <div className="w-3 h-3 bg-red-500 rounded-sm animate-pulse"></div>
                        </div>
                        
                        <div className="flex-1 h-8 bg-sky-50 dark:bg-slate-800 rounded-lg overflow-hidden relative border border-sky-100 dark:border-slate-700">
                            <AudioVisualizer stream={recordingStream} isRecording={isRecording} />
                        </div>
                        
                        <div className="text-xs font-mono font-bold text-slate-500 w-10 text-right">
                            {formatTime(recordingTime)}
                        </div>

                        <button 
                            onClick={stopRecording}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition"
                        >
                            <Square size={16} fill="currentColor"/>
                        </button>
                    </div>
                )}

                {/* AI Sidebar Drawer (Floating inside modal) */}
                {isSidebarOpen && (
                    <>
                    <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="absolute top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Sparkles className="text-emerald-500" size={20}/> AI Summarize
                            </h3>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Step 1: Copy Prompt */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Bước 1: Lấy lệnh (Prompt)</label>
                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 italic">
                                    "{generatePrompt().slice(0, 100)}..."
                                </div>
                                <button 
                                    onClick={handleCopyPrompt}
                                    className="w-full py-2 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:border-emerald-500 hover:text-emerald-600 transition"
                                >
                                    <Copy size={14}/> Copy Prompt
                                </button>
                            </div>

                            {/* Step 2: External Link */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Bước 2: Hỏi AI</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <a 
                                        href="https://gemini.google.com/app" 
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition border border-blue-100 dark:border-blue-800"
                                    >
                                        Mở Gemini ↗
                                    </a>
                                    <a 
                                        href="https://chat.openai.com/" 
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-bold hover:bg-teal-100 dark:hover:bg-teal-900/30 transition border border-teal-100 dark:border-teal-800"
                                    >
                                        Mở ChatGPT ↗
                                    </a>
                                </div>
                            </div>

                            {/* Step 3: Input Result */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Bước 3: Dán kết quả</label>
                                <textarea
                                    className="w-full h-32 p-3 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm dark:text-white resize-none"
                                    placeholder="Dán nội dung tóm tắt từ AI vào đây..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleApplySummary(e.currentTarget.value);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                            <button 
                                onClick={(e) => {
                                    const textarea = e.currentTarget.parentElement?.previousElementSibling?.querySelector('textarea');
                                    if (textarea) handleApplySummary(textarea.value);
                                }} 
                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2"
                            >
                                <CheckSquare size={18}/> Hoàn tất
                            </button>
                        </div>
                    </div>
                    </>
                )}
            </div>
        </div>
      )}

      {/* RESOURCE PREVIEW DRAWER (Unchanged) */}
      {previewResource && (
        <>
            <div className="fixed inset-0 bg-black/60 z-[60] transition-opacity" onClick={() => setPreviewResource(null)}></div>
            <div className="fixed top-0 right-0 h-full w-full md:w-[85%] bg-white dark:bg-slate-950 z-[70] shadow-2xl flex border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
                <div className="w-1/4 min-w-[300px] border-r border-gray-100 dark:border-slate-800 flex flex-col bg-gray-50 dark:bg-slate-900 hidden md:flex">
                     <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                         <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                             <FolderOpen size={18} className="text-emerald-500"/> Tài liệu khác
                         </h3>
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input value={drawerSearchTerm} onChange={(e) => setDrawerSearchTerm(e.target.value)} placeholder="Tìm kiếm tài liệu..." className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" />
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-2 space-y-1">
                         {filteredDrawerResources.map(r => (
                             <button key={r.id} onClick={() => setPreviewResource(r)} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${previewResource.id === r.id ? 'bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700' : 'hover:bg-gray-100 dark:hover:bg-slate-800/50'}`}>
                                 <div className={`p-2 rounded-lg ${r.type === 'File' ? 'bg-orange-100 text-orange-600' : r.type === 'Audio' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'} flex-shrink-0`}>{r.type === 'File' ? <FileText size={16}/> : r.type === 'Audio' ? <FileAudio size={16}/> : <LinkIcon size={16}/>}</div>
                                 <span className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">{r.title}</span>
                             </button>
                         ))}
                     </div>
                </div>
                <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
                     <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                         <div className="flex-1 min-w-0 pr-4">
                             <h2 className="text-lg font-bold text-gray-800 dark:text-white truncate">{previewResource.title}</h2>
                             <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{previewResource.type}</p>
                         </div>
                         <div className="flex items-center gap-2">
                             {previewResource.type !== 'Audio' && (<a href={previewResource.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"><ExternalLink size={16}/> Mở tab mới</a>)}
                             <button onClick={() => setPreviewResource(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500"><X size={24}/></button>
                         </div>
                     </div>
                     <div className="flex-1 bg-gray-100 dark:bg-slate-900/50 relative overflow-hidden flex flex-col justify-center items-center">
                         <div className="w-full h-full flex flex-col">
                            {previewResource.type === 'Audio' ? (
                                <div className="flex-1 flex flex-col items-center justify-start p-8 overflow-y-auto">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 w-full max-w-2xl mb-8 flex flex-col items-center">
                                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6"><PlayCircle size={32} /></div>
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">{previewResource.title}</h3>
                                        <audio controls src={previewResource.url} className="w-full" />
                                    </div>
                                    {previewResource.transcription && (
                                        <div className="w-full max-w-2xl">
                                            <h4 className="font-bold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2"><AlignLeft size={18}/> Bản ghi (Transcript)</h4>
                                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{previewResource.transcription}</div>
                                        </div>
                                    )}
                                </div>
                            ) : previewResource.url === '#local-file' || previewResource.url === '#' ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400"><FileText size={64} className="mb-4 opacity-50"/><p>Đây là file nội bộ demo.</p></div>
                            ) : (
                                <iframe src={previewResource.url} className="w-full h-full border-none bg-white" title="Resource Preview" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
                            )}
                         </div>
                     </div>
                </div>
            </div>
        </>
      )}
      
      {/* PDF DRAWER (Unchanged) */}
      {/* ... */}
      {showPdfDrawer && (
          <>
          <div className="fixed inset-0 bg-black/50 z-[60] transition-opacity" onClick={() => setShowPdfDrawer(false)}></div>
          <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-slate-900 z-[70] shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
               <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                   <div>
                       <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><Printer className="text-emerald-600"/> Xuất PDF</h3>
                       <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Chọn nội dung cần in</p>
                   </div>
                   <button onClick={() => setShowPdfDrawer(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={24}/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-emerald-50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-100 dark:border-slate-700">
                           <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">Ước tính</p>
                           <p className="text-2xl font-bold text-gray-800 dark:text-white">{estimatedPages} <span className="text-sm font-normal text-gray-500">Trang</span></p>
                       </div>
                       <div className="bg-emerald-50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-100 dark:border-slate-700">
                           <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">Dung lượng</p>
                           <p className="text-2xl font-bold text-gray-800 dark:text-white">~{estimatedSize} <span className="text-sm font-normal text-gray-500">MB</span></p>
                       </div>
                   </div>
                   <div>
                       <div className="flex justify-between items-center mb-3">
                           <h4 className="font-bold text-gray-700 dark:text-white">Chọn Ghi chú</h4>
                           <button onClick={() => setSelectedPdfNotes(selectedPdfNotes.length === notes.length ? [] : notes.map(n=>n.id))} className="text-xs font-bold text-emerald-600 hover:underline">{selectedPdfNotes.length === notes.length ? 'Bỏ chọn' : 'Chọn tất cả'}</button>
                       </div>
                       <div className="space-y-2">
                            {notes.length === 0 && <p className="text-sm text-gray-400 italic">Chưa có ghi chú nào.</p>}
                            {notes.map(note => (
                                <div key={note.id} onClick={() => togglePdfNote(note.id)} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${selectedPdfNotes.includes(note.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-slate-600'}`}>
                                        {selectedPdfNotes.includes(note.id) && <CheckSquare size={14}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-800 dark:text-white truncate">{note.title}</p>
                                        <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(note.lastModified).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                       </div>
                   </div>
               </div>
               <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
                    <button onClick={handlePrint} className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition transform active:scale-95">
                        <Download size={20}/> Tải xuống PDF
                    </button>
                    <p className="text-[10px] text-center mt-2 text-gray-400">Trình duyệt sẽ mở hộp thoại in, hãy chọn "Save as PDF".</p>
               </div>
          </div>
          </>
      )}

      {/* TASK MODAL (Unchanged) */}
      {/* ... */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity no-print">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-2xl font-bold dark:text-white">{editingTask ? 'Chỉnh sửa Task' : t.addTask}</h3>
                    <button onClick={() => setShowTaskModal(false)}><X className="text-gray-500 hover:text-red-500" size={28}/></button>
                </div>
                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <div className="flex justify-between">
                             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">{t.name}</label>
                             {!editingTask && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Tip: Nhập "Task-DDMM-Priority" (VD: Math-1202-3) rồi Enter</span>}
                        </div>
                        <input value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} onKeyDown={handleTaskKeyDown} className="w-full text-lg p-4 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 dark:bg-slate-950 dark:text-white" placeholder="..." autoFocus/>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Deadline</label>
                            <input type="date" value={newTaskDate} onChange={e=>setNewTaskDate(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none dark:bg-slate-950 dark:text-white"/>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Priority</label>
                             <div className="flex gap-2">
                                {['Low', 'Medium', 'High'].map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setNewTaskPriority(p as any)}
                                        className={`flex-1 py-3 rounded-xl border font-medium transition ${newTaskPriority === p 
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300' 
                                            : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900">
                    <button onClick={() => setShowTaskModal(false)} className="px-6 py-3 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 font-medium">{t.cancel}</button>
                    <button onClick={handleSaveTask} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none">{t.save}</button>
                </div>
            </div>
        </div>
      )}

      {/* RESOURCE MODAL (Unchanged) */}
      {/* ... */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity no-print">
             <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
                {/* ... same resource modal content ... */}
                <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold dark:text-white">{t.addResource}</h3>
                    <button onClick={() => setShowResourceModal(false)}><X className="text-gray-500 hover:text-red-500" size={24}/></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* ... */}
                    <div>
                         <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Type</label>
                         <div className="flex gap-2">
                             {['Link', 'File', 'Audio'].map(t => (
                                 <button key={t} onClick={()=>setResType(t as any)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${resType === t ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400'}`}>
                                     {t}
                                 </button>
                             ))}
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">{t.name}</label>
                        <input value={resTitle} onChange={e=>setResTitle(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 dark:bg-slate-950 dark:text-white" placeholder="Tiêu đề tài liệu..."/>
                    </div>
                    {resType === 'Link' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">URL</label>
                            <input value={resUrl} onChange={handleUrlChange} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 dark:bg-slate-950 dark:text-white" placeholder="https://..."/>
                        </div>
                    )}
                    {resType === 'File' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Upload File</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setResTitle(file.name); setResUrl('#local-file'); } }} />
                                <UploadCloud className="mx-auto text-gray-400 mb-2"/>
                                <span className="text-sm text-gray-500">Click or Drag file here</span>
                            </div>
                        </div>
                    )}
                    {resType === 'Audio' && (
                        <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-xl text-center text-sm text-gray-500">
                            Tính năng ghi âm trực tiếp đã được chuyển vào mục Ghi chú.
                        </div>
                    )}
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3 bg-gray-50 dark:bg-slate-900">
                    <button onClick={handleSaveResource} className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{t.save}</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetail;