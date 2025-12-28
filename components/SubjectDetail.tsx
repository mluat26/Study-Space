import React, { useState, useEffect, useRef } from 'react';
import { Subject, Task, Note, Resource, Language } from '../types';
import { Plus, CheckCircle, Circle, FileText, Link as LinkIcon, Trash2, ArrowLeft, X, Printer, Calendar, ArrowRight, GripVertical, AlertCircle, PlayCircle, FolderOpen, Video, Copy, Wand2, PenTool, Download, CheckSquare, Square, File, UploadCloud, Clock, Save, FilePlus, Sparkles, Archive, Search, ExternalLink, Mic, StopCircle, FileAudio, AlignLeft, Eye, EyeOff, MessageSquare, Headphones, ChevronRight, Play, Pause, Music, Loader2, LayoutGrid, List, Minus, Image as ImageIcon, Paperclip, Globe, MoreVertical, Layers, ChevronLeft, Settings, ZoomIn, ZoomOut, Youtube } from 'lucide-react';
import { ICONS, TRANSLATIONS } from '../constants';
import RichTextEditor, { RichTextEditorRef } from './RichTextEditor';
import AudioVisualizer from './AudioVisualizer';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.11.174";

// Configure PDF.js worker
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

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
  onMinimize?: (note: Note) => void;
  onNoteActive?: (noteId: string | null) => void; 
}

interface AudioAttachment {
    id: string;
    url: string; 
    name: string;
    createdAt: string;
}

interface LinkAttachment {
    href: string;
    text: string;
}

const processContentForPrint = (htmlContent: string) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        // Hide audio placeholders in the main text as they will be listed at the bottom
        const audioDivs = doc.querySelectorAll('.smartstudy-audio-data');
        audioDivs.forEach(div => (div as HTMLElement).style.display = 'none');
        
        // Ensure images are styled for print (inline but constrained)
        const images = doc.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '10px 0';
        });
        return doc.body.innerHTML;
    } catch (e) {
        return htmlContent;
    }
};

const extractMetadataFromContent = (htmlContent: string) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        const audios: {name: string, date: string}[] = [];
        doc.querySelectorAll('.smartstudy-audio-data').forEach(div => {
            const name = div.getAttribute('data-name') || 'Audio File';
            const date = div.getAttribute('data-created') || '';
            audios.push({ name, date });
        });

        const links: {text: string, href: string}[] = [];
        doc.querySelectorAll('a').forEach(a => {
            if(a.href) links.push({ text: a.innerText || a.href, href: a.href });
        });

        return { audios, links };
    } catch (e) {
        return { audios: [], links: [] };
    }
}

const getYoutubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11)
      ? `https://www.youtube.com/embed/${match[2]}`
      : null;
};

const isYoutubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

const SubjectDetail: React.FC<SubjectDetailProps> = ({
  subject, tasks, notes, resources,
  onAddTask, onUpdateTask, onDeleteTask,
  onAddNote, onUpdateNote, onDeleteNote,
  onAddResource, onDeleteResource, onBack, onEditSubject, onArchiveSubject, lang, initialOpenNoteId, isCreatingNote, onMinimize, onNoteActive
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'resources'>('tasks');
  const [resourceFilter, setResourceFilter] = useState<'All' | 'Link' | 'File' | 'Audio'>('All');
  const [noteViewMode, setNoteViewMode] = useState<'grid' | 'table'>('grid');
  
  const t = TRANSLATIONS[lang];
  
  // Modals & Drawers
  const [showTaskDrawer, setShowTaskDrawer] = useState(false); // Changed from Modal to Drawer
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResourceDrawer, setShowResourceDrawer] = useState(false); // Changed to Drawer
  const [showPdfDrawer, setShowPdfDrawer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Exclusive Sidebar State
  const [activeSidebar, setActiveSidebar] = useState<'none' | 'attachment' | 'audio' | 'ai' | 'pdf_export'>('none');

  // Attachment Sidebar specific
  const [extractedImages, setExtractedImages] = useState<string[]>([]);
  const [extractedLinks, setExtractedLinks] = useState<LinkAttachment[]>([]);
  // New Link Input in Sidebar
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [showAddLinkInput, setShowAddLinkInput] = useState(false);

  // Resource Preview
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [drawerSearchTerm, setDrawerSearchTerm] = useState('');

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Task Form State
  const [taskMode, setTaskMode] = useState<'single' | 'bulk'>('single');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<'High'|'Medium'|'Low'>('Medium');
  // Bulk Task State
  const [bulkTaskContent, setBulkTaskContent] = useState('');

  // Note Form State
  const editorRef = useRef<RichTextEditorRef>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [audioAttachments, setAudioAttachments] = useState<AudioAttachment[]>([]);
  const [isNoteDirty, setIsNoteDirty] = useState(false); 
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  // Single Note PDF Options
  const [singlePdfOpts, setSinglePdfOpts] = useState({
      header: true,
      audio: true,
      sources: true
  });

  // AI State
  const [aiSummaryResult, setAiSummaryResult] = useState('');

  const noteTitleRef = useRef(noteTitle);
  useEffect(() => { noteTitleRef.current = noteTitle; }, [noteTitle]);

  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resType, setResType] = useState<'Link' | 'File' | 'Audio'>('Link');
  const [resTranscription, setResTranscription] = useState('');

  // Audio Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // PDF Export
  const [selectedPdfNotes, setSelectedPdfNotes] = useState<string[]>([]);
  const [printData, setPrintData] = useState<Note[] | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Task Pagination State
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const TASKS_PER_PAGE = 6;

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

  useEffect(() => {
      return () => {
          stopRecordingInternal();
          if (onNoteActive) onNoteActive(null);
      };
  }, []);

  // PDF Loading Effect
  useEffect(() => {
      if (previewResource && (previewResource.type === 'File' || (previewResource.type === 'Link' && previewResource.url.endsWith('.pdf')))) {
          // Reset state
          setPageNum(1);
          setNumPages(0);
          setScale(1.0);
          setPdfDoc(null);

          const loadPdf = async () => {
              try {
                  const loadingTask = pdfjs.getDocument(previewResource.url);
                  const pdf = await loadingTask.promise;
                  setPdfDoc(pdf);
                  setNumPages(pdf.numPages);
              } catch (error) {
                  console.error('Error loading PDF:', error);
              }
          };
          loadPdf();
      }
  }, [previewResource]);

  // PDF Render Page Effect
  useEffect(() => {
      const renderPage = async () => {
          if (!pdfDoc || !canvasRef.current) return;

          try {
              if (renderTaskRef.current) {
                  await renderTaskRef.current.cancel();
              }

              const page = await pdfDoc.getPage(pageNum);
              const viewport = page.getViewport({ scale });
              const canvas = canvasRef.current;
              const context = canvas.getContext('2d');

              if (!context) return;

              canvas.height = viewport.height;
              canvas.width = viewport.width;

              const renderContext = {
                  canvasContext: context,
                  viewport: viewport,
              };

              const renderTask = page.render(renderContext);
              renderTaskRef.current = renderTask;
              await renderTask.promise;
          } catch (error: any) {
              if (error.name !== 'RenderingCancelledException') {
                  console.error('Render error:', error);
              }
          }
      };

      renderPage();
  }, [pdfDoc, pageNum, scale]);


  const stopRecordingInternal = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setRecordingStream(null);
  }

  // Toggle Logic for Sidebars
  const toggleSidebar = (sidebar: 'attachment' | 'audio' | 'ai' | 'pdf_export') => {
      if (activeSidebar === sidebar) {
          setActiveSidebar('none');
      } else {
          setActiveSidebar(sidebar);
      }
  };

  const getNoteStats = (html: string) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
      const bytes = new Blob([html]).size;
      const sizeDisplay = bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
      return { wordCount, sizeDisplay };
  };

  const getNotePreviewData = (htmlContent: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract AI Summary first
      const summaryDiv = doc.querySelector('.ai-summary-content');
      const aiSummary = summaryDiv ? (summaryDiv.textContent || '').trim() : null;
      
      // Remove summary div to get clean content stats
      if(summaryDiv) summaryDiv.remove();

      // Check media presence
      const hasImages = doc.querySelector('img') !== null;
      const hasAudio = doc.querySelector('.smartstudy-audio-data') !== null;
      
      // Get plain text
      const bodyText = (doc.body.textContent || '').trim();

      return {
          aiSummary,
          bodyText,
          hasImages,
          hasAudio
      };
  };

  const parseNoteContent = (htmlContent: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const audios: AudioAttachment[] = [];
      const images: string[] = [];
      const links: LinkAttachment[] = [];

      const hiddenAudioDivs = doc.querySelectorAll('.smartstudy-audio-data');
      hiddenAudioDivs.forEach(div => {
          const urlContent = div.textContent || (div as HTMLElement).innerText;
          const urlAttr = div.getAttribute('data-url');
          const url = (urlContent && urlContent.startsWith('data:')) ? urlContent : urlAttr;
          const name = div.getAttribute('data-name') || 'Bản ghi âm';
          const createdAt = div.getAttribute('data-created') || new Date().toISOString();
          const id = div.getAttribute('id') || Date.now().toString() + Math.random();
          if (url) {
              audios.push({ id, url: url.trim(), name, createdAt });
              div.remove(); 
          }
      });

      const imgTags = doc.querySelectorAll('img');
      imgTags.forEach(img => {
          if(img.src) images.push(img.src);
      });

      const aTags = doc.querySelectorAll('a');
      aTags.forEach(a => {
          if(a.href) links.push({ href: a.href, text: a.innerText || a.href });
      });

      return {
          cleanedContent: doc.body.innerHTML,
          audios,
          images,
          links
      };
  };

  const openNote = (note: Note | null) => {
      setEditingNote(note);
      if (note) {
          setNoteTitle(note.title);
          const { cleanedContent, audios, images, links } = parseNoteContent(note.content);
          setNoteContent(cleanedContent);
          setAudioAttachments(audios);
          setExtractedImages(images);
          setExtractedLinks(links);
      } else {
          setNoteTitle('');
          setNoteContent('');
          setAudioAttachments([]);
          setExtractedImages([]);
          setExtractedLinks([]);
          setActiveSidebar('none');
      }
      setIsNoteDirty(false);
      setShowNoteModal(true);
      if (onNoteActive) onNoteActive(note ? note.id : 'new');
  }

  const openAddTaskDrawer = () => {
      setEditingTask(null);
      setNewTaskTitle('');
      setNewTaskDate(new Date().toISOString().split('T')[0]);
      setNewTaskPriority('Medium');
      setTaskMode('single');
      setBulkTaskContent('');
      setShowTaskDrawer(true);
  }

  const openEditTaskDrawer = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskDate(task.dueDate);
      setNewTaskPriority(task.priority);
      setTaskMode('single');
      setShowTaskDrawer(true);
  }

  // Smart Input Parser
  const parseSmartInput = (input: string, defaultDate: string, defaultPriority: 'High'|'Medium'|'Low') => {
      // Regex to capture Title - Date(DDMM or DDMMYYYY) - PriorityCode
      const regex = /(.+?)(?:-(\d{3,8}))?(?:-(\d))?$/;
      const match = input.match(regex);
      
      if (match) {
          const title = match[1].trim();
          const dateStr = match[2];
          const priorityCode = match[3];

          let formattedDate = defaultDate;
          if (dateStr) {
            const currentYear = new Date().getFullYear();
            let day, month, year;
            if (dateStr.length === 4) {
                day = parseInt(dateStr.substring(0, 2));
                month = parseInt(dateStr.substring(2, 4)) - 1; 
                year = currentYear;
            } else if (dateStr.length === 8) {
                day = parseInt(dateStr.substring(0, 2));
                month = parseInt(dateStr.substring(2, 4)) - 1;
                year = parseInt(dateStr.substring(4, 8));
            }
            if (day && !isNaN(day)) {
                const dateObj = new Date(year!, month!, day);
                if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toISOString().split('T')[0];
                }
            }
          }

          let priority: 'Low' | 'Medium' | 'High' = defaultPriority;
          if (priorityCode === '1') priority = 'Low';
          if (priorityCode === '2') priority = 'Medium';
          if (priorityCode === '3') priority = 'High';

          return { title, date: formattedDate, priority };
      }
      return { title: input, date: defaultDate, priority: defaultPriority };
  };

  const handleSaveTask = () => {
    if (taskMode === 'single') {
        if(newTaskTitle.trim()) {
            if (editingTask) {
                onUpdateTask({ ...editingTask, title: newTaskTitle, dueDate: newTaskDate, priority: newTaskPriority });
            } else {
                const newTask: Task = { 
                    id: Date.now().toString(), 
                    subjectId: subject.id, 
                    title: newTaskTitle, 
                    status: 'todo', 
                    dueDate: newTaskDate, 
                    priority: newTaskPriority 
                };
                onAddTask(newTask);
            }
            setShowTaskDrawer(false);
        }
    } else {
        // Bulk Mode
        if (!bulkTaskContent.trim()) return;
        const lines = bulkTaskContent.split('\n');
        const today = new Date().toISOString().split('T')[0];
        
        // Accumulate valid tasks
        lines.forEach(line => {
            if (!line.trim()) return;
            const { title, date, priority } = parseSmartInput(line.trim(), today, 'Low');
            if (title) {
                const newTask: Task = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    subjectId: subject.id,
                    title: title,
                    status: 'todo',
                    dueDate: date,
                    priority: priority
                };
                onAddTask(newTask); // Relies on App.tsx using prev state update
            }
        });
        setShowTaskDrawer(false);
    }
  }

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSaveTask();
      }
  }

  // --- Adding Link from Sidebar ---
  const handleAddLinkFromSidebar = () => {
      if (newLinkUrl.trim() && newLinkTitle.trim()) {
          const newRes: Resource = {
              id: Date.now().toString(),
              subjectId: subject.id,
              title: newLinkTitle,
              type: 'Link',
              url: newLinkUrl
          };
          onAddResource(newRes);

          if (editorRef.current) {
              editorRef.current.insertContent(`<p><a href="${newLinkUrl}" target="_blank">${newLinkTitle}</a></p>`);
              setExtractedLinks(prev => [...prev, { href: newLinkUrl, text: newLinkTitle }]);
          }

          setNewLinkUrl('');
          setNewLinkTitle('');
          setShowAddLinkInput(false);
      }
  }

  const handleSaveNote = () => {
      let finalTitle = noteTitle.trim();
      let content = noteContent;
      
      if(editorRef.current) {
          content = editorRef.current.getContent();
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          
          const imgs: string[] = [];
          doc.querySelectorAll('img').forEach(img => imgs.push(img.src));
          setExtractedImages(imgs);

          const links: LinkAttachment[] = [];
          doc.querySelectorAll('a').forEach(a => links.push({ href: a.href, text: a.innerText || a.href }));
          setExtractedLinks(links);
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      if (!finalTitle && plainText.trim()) {
          finalTitle = plainText.split(/\s+/).slice(0, 5).join(' ') + (plainText.length > 30 ? '...' : '');
      }
      if(!finalTitle) finalTitle = "Untitled Note";
      
      let audioHtml = '';
      if (audioAttachments.length > 0) {
          audioHtml = audioAttachments.map(audio => `
            <div 
                id="${audio.id}" 
                class="smartstudy-audio-data" 
                data-name="${audio.name}" 
                data-created="${audio.createdAt}" 
                style="display:none;"
            >${audio.url}</div>
          `).join('');
      }
      const finalContent = content + audioHtml;

      setNoteTitle(finalTitle);
      const timestamp = new Date().toISOString();

      const noteData = {
          id: editingNote ? editingNote.id : Date.now().toString(),
          subjectId: subject.id,
          title: finalTitle,
          content: finalContent,
          lastModified: timestamp
      };

      if (editingNote) {
            onUpdateNote(noteData);
            setEditingNote(noteData); 
      } else {
            onAddNote(noteData);
            setEditingNote(noteData); 
      }
      setIsNoteDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      return noteData;
  };

  const handleCloseNoteModal = () => {
      if (isNoteDirty) {
          handleSaveNote();
      }
      stopRecordingInternal();
      setIsNoteDirty(false);
      setShowNoteModal(false);
      setActiveSidebar('none');
      if (onNoteActive) onNoteActive(null);
  }

  const handleMinimize = () => {
      const savedNote = handleSaveNote();
      if (onMinimize) {
          onMinimize(savedNote);
      }
      setShowNoteModal(false);
      if (onNoteActive) onNoteActive(null); 
  }

  // --- Audio Recording Logic ---
  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setRecordingStream(stream); 
          
          let mimeType = 'audio/webm';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4'; 
          }

          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = mediaRecorder;
          chunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = () => {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                  const base64data = reader.result as string;
                  const timestamp = new Date();
                  const timeString = timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const newAudioId = Date.now().toString();

                  const newAudio: AudioAttachment = {
                      id: newAudioId,
                      url: base64data,
                      name: `Ghi âm ${timeString}`,
                      createdAt: timestamp.toISOString()
                  };
                  
                  setAudioAttachments(prev => [newAudio, ...prev]);
                  setActiveSidebar('audio'); 
                  setIsNoteDirty(true); 

                  const currentTitle = noteTitleRef.current.trim() || "Ghi chú chưa đặt tên";
                  const dateTimeStr = timestamp.toLocaleString('vi-VN');
                  
                  const newResource: Resource = {
                      id: `res-audio-${newAudioId}`,
                      subjectId: subject.id,
                      title: `${currentTitle} - ${dateTimeStr}`,
                      type: 'Audio',
                      url: base64data,
                      transcription: '' 
                  };
                  onAddResource(newResource);
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
          onDeleteResource(`res-audio-${id}`);
      }
  };
  
  const deleteImageAttachment = (src: string) => {
      if(window.confirm('Xóa hình ảnh này khỏi nội dung?')) {
          if (editorRef.current) {
              const currentContent = editorRef.current.getContent();
              const newContent = currentContent.replace(new RegExp(`<img[^>]*src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g'), '');
              editorRef.current.insertContent(""); // Hard reset approach not ideal but effective for now
              // In reality, RichTextEditor ref should expose safer manipulation. 
              // Trigger save to update
              setExtractedImages(prev => prev.filter(s => s !== src));
              setIsNoteDirty(true);
          }
      }
  }

  const deleteLinkAttachment = (href: string) => {
      if(window.confirm('Xóa liên kết này khỏi nội dung?')) {
          const editorDiv = document.querySelector('.prose[contenteditable]');
          if (editorDiv) {
              const links = editorDiv.querySelectorAll('a');
              links.forEach(a => {
                  if(a.href === href) a.remove();
              });
          }
          setExtractedLinks(prev => prev.filter(l => l.href !== href));
          setIsNoteDirty(true);
      }
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Đã sao chép liên kết!");
  };

  const downloadFile = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const generatePrompt = () => {
      if (!editorRef.current) return '';
      const content = editorRef.current.getPlainText();
      return `Là 1 người học bạn hãy tóm tắt đoạn sau từ 60-80 từ dạng đoạn văn nhé lấy ý chính thôi - kêt quả trả về chỉ có only đoạn tóm tắt k nói gì thêm:\n\n"${content}"`;
  };

  const handleCopyPrompt = () => {
      const prompt = generatePrompt();
      navigator.clipboard.writeText(prompt);
      alert("Đã copy Prompt!");
  };

  const handleApplySummary = () => {
      if (editorRef.current && aiSummaryResult.trim()) {
           editorRef.current.setSummary(aiSummaryResult);
           setAiSummaryResult('');
           setActiveSidebar('none');
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
          setShowResourceDrawer(false);
      }
  }

  const togglePdfNote = (id: string) => {
      setSelectedPdfNotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const handleExportPDF = () => {
      const notesToPrint = notes.filter(n => selectedPdfNotes.includes(n.id));
      if (notesToPrint.length === 0) return;
      
      setIsExporting(true);
      setPrintData(notesToPrint);
      
      // Wait for React to render the hidden print area
      setTimeout(async () => {
          // Select all individual note containers
          const elements = document.querySelectorAll('.printable-note-item');
          if (elements.length > 0) {
             try {
                 const pdf = new jsPDF('p', 'mm', 'a4');
                 const pdfWidth = pdf.internal.pageSize.getWidth();
                 const pdfHeight = pdf.internal.pageSize.getHeight();
                 const margin = 20; // Increased margin
                 const printWidth = pdfWidth - (margin * 2);

                 for (let i = 0; i < elements.length; i++) {
                     const el = elements[i] as HTMLElement;
                     
                     // Capture each note individually
                     const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                     const imgData = canvas.toDataURL('image/png');
                     
                     const imgProps = pdf.getImageProperties(imgData);
                     const imgHeight = (imgProps.height * printWidth) / imgProps.width;
                     
                     let heightLeft = imgHeight;
                     let position = margin; // Start from top margin

                     // Add the first page of the note
                     // x = margin, y = position, w = printWidth
                     pdf.addImage(imgData, 'PNG', margin, position, printWidth, imgHeight);
                     heightLeft -= (pdfHeight - margin); // Account for top margin on first page

                     // If note is longer than one page, add subsequent pages
                     while (heightLeft > 0) {
                         position -= pdfHeight; 
                         pdf.addPage();
                         // On subsequent pages, we don't strictly enforce top margin for image stitching unless we split the image.
                         // Standard jsPDF addImage stitching:
                         pdf.addImage(imgData, 'PNG', margin, position, printWidth, imgHeight);
                         heightLeft -= pdfHeight;
                     }

                     // If there are more notes, add a new page for the next note
                     if (i < elements.length - 1) {
                         pdf.addPage();
                     }
                 }
                 
                 pdf.save(`${subject.name}_Notes.pdf`);
             } catch (e) {
                 console.error(e);
                 alert("Lỗi khi xuất PDF");
             } finally {
                 setIsExporting(false);
                 setPrintData(null);
                 setShowPdfDrawer(false);
             }
          } else {
              setIsExporting(false);
              setPrintData(null);
          }
      }, 1000);
  }

  const handleExportSingleNotePDF = () => {
      setIsExporting(true);
      setTimeout(async () => {
          const element = document.getElementById('single-note-print-preview');
          if (element) {
              try {
                  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = pdf.internal.pageSize.getHeight();
                  const margin = 20; // Increased margin
                  const printWidth = pdfWidth - (margin * 2);

                  const imgProps = pdf.getImageProperties(imgData);
                  const imgHeight = (imgProps.height * printWidth) / imgProps.width;
                  
                  let heightLeft = imgHeight;
                  let position = margin; // Start from top margin
                  
                  pdf.addImage(imgData, 'PNG', margin, position, printWidth, imgHeight);
                  heightLeft -= (pdfHeight - margin);
                  
                  while (heightLeft > 0) {
                      position -= pdfHeight; 
                      pdf.addPage();
                      pdf.addImage(imgData, 'PNG', margin, position, printWidth, imgHeight);
                      heightLeft -= pdfHeight;
                  }
                  
                  pdf.save(`${noteTitle || 'Note'}.pdf`);
              } catch (e) {
                  console.error(e);
                  alert("Lỗi khi xuất PDF");
              } finally {
                  setIsExporting(false);
                  setActiveSidebar('none');
              }
          }
      }, 500);
  }
  
  const renderHeaderIcon = () => {
      if (subject.icon.startsWith('<svg')) {
          return <div className="text-white" style={{width: 300, height: 300, opacity: 0.2}} dangerouslySetInnerHTML={{ __html: subject.icon }} />;
      }
      if (subject.icon.startsWith('data:image') || subject.icon.startsWith('http')) {
          return <img src={subject.icon} className="w-[300px] h-[300px] object-cover opacity-20 rounded-full" alt="Subject Icon" />;
      }
      const IconComp = ICONS[subject.icon] || ICONS['Book'];
      return <IconComp size={300} className="text-white" />;
  }

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
  
  // Pagination Logic
  const totalTaskPages = Math.ceil(sortedTasks.length / TASKS_PER_PAGE);
  const currentTasks = sortedTasks.slice((currentTaskPage - 1) * TASKS_PER_PAGE, currentTaskPage * TASKS_PER_PAGE);

  const nextPage = () => setCurrentTaskPage(prev => Math.min(prev + 1, totalTaskPages));
  const prevPage = () => setCurrentTaskPage(prev => Math.max(prev - 1, 1));
  const goToPage = (p: number) => setCurrentTaskPage(p);

  const filteredResources = resources.filter(r => resourceFilter === 'All' || r.type === resourceFilter);
  const notesToPrint = notes.filter(n => selectedPdfNotes.includes(n.id));
  const estimatedPages = Math.ceil((tasks.length * 50 + notesToPrint.reduce((acc, n) => acc + n.content.length/2, 0)) / 3000) || 1;
  const estimatedSize = (notesToPrint.length * 0.15 + 0.2).toFixed(2);
  const filteredDrawerResources = resources.filter(r => r.title.toLowerCase().includes(drawerSearchTerm.toLowerCase()));

  const handleDropResource = (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
          const file = files[0];
          handleResourceFileSelect(file);
      }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setResUrl(url);
      if (!resTitle && url.length > 5) {
          try {
              const urlObj = new URL(url);
              let name = urlObj.hostname.replace('www.', '');
              // Auto-detect YouTube title logic could be here but usually requires API
              if (url.includes('youtube') || url.includes('youtu.be')) {
                  name = 'YouTube Video';
              } else {
                  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                  if (pathSegments.length > 0) name = pathSegments[pathSegments.length - 1];
              }
              if (name.length > 20) name = name.substring(0, 20) + '...';
              setResTitle(name);
          } catch { }
      }
  }
  
  const handleResourceFileSelect = (file: File) => {
      setResTitle(file.name);
      setResType('File');
      const reader = new FileReader();
      reader.onload = (e) => {
          if (e.target?.result) {
              setResUrl(e.target.result as string);
              setShowResourceDrawer(true);
          }
      };
      reader.readAsDataURL(file);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCustomColor = subject.color.startsWith('#');
  const headerStyle = isCustomColor ? { backgroundColor: subject.color } : {};
  const headerClass = isCustomColor ? '' : subject.color;

  const IconComp = ICONS[subject.icon] || ICONS['Book'];
  
  // Render specific content for PDF Preview
  const isPDF = previewResource && (previewResource.type === 'File' || (previewResource.type === 'Link' && previewResource.url.endsWith('.pdf')));

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-slate-950 relative transition-colors">
      <style>{`
        @media print {
            body > * { display: none !important; }
        }
        /* Style for visual page break in preview/canvas */
        .print-page-break {
            margin: 40px 0;
            height: 40px;
            background-color: #f1f5f9;
            border-top: 2px dashed #cbd5e1;
            border-bottom: 2px dashed #cbd5e1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            clear: both;
            break-after: page;
        }
        .print-page-break::before {
             content: 'PAGE BREAK';
             font-size: 10px;
             color: #94a3b8;
             font-weight: bold;
             letter-spacing: 2px;
             text-transform: uppercase;
        }
        
      `}</style>
      
      {/* Header */}
      <div 
        className={`p-8 relative overflow-hidden flex-shrink-0 no-print transition-all duration-300 ${headerClass}`}
        style={headerStyle}
      >
         <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 pointer-events-none">
             {renderHeaderIcon()}
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
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => onEditSubject && onEditSubject(subject)} className="flex items-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10"><PenTool size={18} /></button>
                    <button onClick={() => onArchiveSubject && onArchiveSubject(subject.id)} className="flex items-center gap-2 bg-white/20 text-white px-4 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10"><Archive size={18} /></button>
                    <button onClick={() => { setSelectedPdfNotes(notes.map(n=>n.id)); setShowPdfDrawer(true); }} className="flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl hover:bg-white/30 transition backdrop-blur-md font-medium border border-white/10"><Printer size={18} /> {t.exportPdf}</button>
                </div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="no-print flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 flex space-x-8">
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
      </div>

      {/* Main Content */}
      <div className="subject-content flex-1 p-8 overflow-y-auto bg-gray-50 dark:bg-slate-950/50 no-print">
        {/* TASKS */}
        {activeTab === 'tasks' && (
          <div className="max-w-7xl mx-auto h-full flex flex-col">
             <div className="flex justify-between items-center mb-6 flex-shrink-0">
                 <h2 className="text-xl font-bold dark:text-white">{t.tasks}</h2>
                 <button 
                    onClick={openAddTaskDrawer}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-medium shadow-md shadow-emerald-200 dark:shadow-none"
                 >
                     <Plus size={20} /> {t.addTask}
                 </button>
             </div>

             <div className="flex-1 flex flex-col">
                 {sortedTasks.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                         <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-full mb-3"><AlertCircle size={32}/></div>
                         <p>Chưa có công việc nào.</p>
                     </div>
                 ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {currentTasks.map(task => (
                            <div key={task.id} className={`p-3 rounded-xl border flex items-center gap-3 transition-all hover:shadow-md ${task.status === 'done' ? 'bg-gray-50 border-gray-200 dark:bg-slate-900/50 dark:border-slate-800 opacity-70' : 'bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700'}`}>
                                <button 
                                    onClick={() => toggleTaskStatus(task)}
                                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-slate-600 hover:border-emerald-500 text-transparent'}`}
                                >
                                    <CheckCircle size={12} fill="currentColor" className={task.status === 'done' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-500 dark:text-slate-500' : 'text-gray-800 dark:text-white'}`}>{task.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                        <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : ''}`}><Calendar size={12}/> {task.dueDate}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${task.priority === 'High' ? 'bg-red-100 text-red-600' : task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>{task.priority}</span>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                     <button onClick={() => openEditTaskDrawer(task)} className="p-1.5 text-gray-400 hover:text-emerald-500"><PenTool size={16}/></button>
                                     <button onClick={() => onDeleteTask(task.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalTaskPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-auto pb-4">
                            <button 
                                onClick={prevPage}
                                disabled={currentTaskPage === 1}
                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition text-gray-600 dark:text-slate-400"
                            >
                                <ChevronLeft size={20}/>
                            </button>
                            
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalTaskPages }, (_, i) => i + 1).map(pageNum => (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${currentTaskPage === pageNum ? 'bg-emerald-500 w-6' : 'bg-gray-300 dark:bg-slate-700 hover:bg-emerald-300'}`}
                                    />
                                ))}
                            </div>

                            <button 
                                onClick={nextPage}
                                disabled={currentTaskPage === totalTaskPages}
                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition text-gray-600 dark:text-slate-400"
                            >
                                <ChevronRight size={20}/>
                            </button>
                        </div>
                    )}
                    </>
                 )}
             </div>
          </div>
        )}

        {/* NOTES */}
        {activeTab === 'notes' && (
          <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold dark:text-white">{t.notes}</h2>
                 <div className="flex gap-2">
                     <div className="flex bg-gray-200 dark:bg-slate-900 p-1 rounded-lg">
                        <button onClick={() => setNoteViewMode('grid')} className={`p-2 rounded-md transition ${noteViewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setNoteViewMode('table')} className={`p-2 rounded-md transition ${noteViewMode === 'table' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-slate-500'}`}><List size={18} /></button>
                     </div>
                     <button onClick={() => openNote(null)} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 dark:shadow-none font-medium"><Plus size={20} /> {t.addNote}</button>
                 </div>
             </div>
             
             {noteViewMode === 'grid' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {notes.map(note => {
                        const { aiSummary, bodyText, hasImages, hasAudio } = getNotePreviewData(note.content);
                        const { sizeDisplay } = getNoteStats(note.content);
                        
                        return (
                        <div key={note.id} onClick={() => openNote(note)} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-500/50 transition-all cursor-pointer group relative flex flex-col h-64">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-lg line-clamp-2">{note.title}</h3>
                            
                            <div className="flex-1 overflow-hidden relative">
                                {aiSummary ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/50 mb-2">
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            <Sparkles size={12}/> AI Summary
                                        </div>
                                        <p className="text-sm text-emerald-900 dark:text-emerald-100 line-clamp-3 leading-relaxed">
                                            {aiSummary}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                                        {bodyText || 'Chưa có nội dung...'}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-50 dark:border-slate-800/50 text-[11px] font-medium text-gray-400 dark:text-slate-500">
                                <span>{new Date(note.lastModified).toLocaleDateString()}</span>
                                <div className="flex gap-2 items-center">
                                    {hasImages && <div className="p-1 bg-orange-50 dark:bg-orange-900/20 rounded text-orange-500" title="Có hình ảnh"><ImageIcon size={12}/></div>}
                                    {hasAudio && <div className="p-1 bg-purple-50 dark:bg-purple-900/20 rounded text-purple-500" title="Có ghi âm"><Mic size={12}/></div>}
                                    <span>{sizeDisplay}</span>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 transition-all transform scale-90 hover:scale-100"><Trash2 size={16} /></button>
                        </div>
                    )})}
                </div>
             ) : (
                 <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                     <table className="w-full text-left border-collapse">
                         <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                             <tr>
                                 <th className="px-6 py-4">Tên ghi chú</th>
                                 <th className="px-6 py-4 w-32">Dung lượng</th>
                                 <th className="px-6 py-4 w-32">Số từ</th>
                                 <th className="px-6 py-4 w-40">Ngày sửa</th>
                                 <th className="px-6 py-4 w-20 text-center">Hành động</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                             {notes.map(note => {
                                 const { wordCount, sizeDisplay } = getNoteStats(note.content);
                                 return (
                                     <tr key={note.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition cursor-pointer" onClick={() => openNote(note)}>
                                         <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{note.title}</td>
                                         <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono">{sizeDisplay}</td>
                                         <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 font-mono">{wordCount}</td>
                                         <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{new Date(note.lastModified).toLocaleDateString()}</td>
                                         <td className="px-6 py-4 text-center">
                                             <button onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }} className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={18} /></button>
                                         </td>
                                     </tr>
                                 )
                             })}
                         </tbody>
                     </table>
                 </div>
             )}
          </div>
        )}

        {/* RESOURCES */}
        {activeTab === 'resources' && (
          <div className="max-w-7xl mx-auto">
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
                     <button onClick={() => setShowResourceDrawer(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 shadow-md">
                         <LinkIcon size={20} /> {t.addResource}
                     </button>
                 </div>
             </div>
             
             <div 
                className="mb-6 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900/50 transition cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropResource}
                onClick={() => setShowResourceDrawer(true)}
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
                     if (isYoutubeUrl(res.url)) { ResIcon = Youtube; iconColor = 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'; }

                     return (
                     <div key={res.id} onClick={() => { setPreviewResource(res); setDrawerSearchTerm(''); }} className="p-5 flex items-center justify-between group bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 transition shadow-sm backdrop-blur-sm cursor-pointer gap-4">
                         <div className="flex items-center gap-5 overflow-hidden flex-1 min-w-0">
                             <div className={`${iconColor} p-4 rounded-xl flex-shrink-0`}><ResIcon size={24} /></div>
                             <div className="min-w-0 flex-1">
                                 <div className="font-bold text-lg text-gray-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 block truncate transition-colors">{res.title}</div>
                                 <p className="text-sm text-gray-400 mt-1 truncate max-w-xl">{res.type === 'Audio' ? 'Audio Recording' : (res.url.startsWith('data:') ? 'Local File' : res.url)}</p>
                             </div>
                         </div>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {res.type === 'Link' ? (
                                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(res.url); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Copy Link"><Copy size={20}/></button>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); downloadFile(res.url, res.title); }} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="Download"><Download size={20}/></button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); onDeleteResource(res.id); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                         </div>
                     </div>
                 )})}
             </div>
          </div>
        )}
      </div>

      {/* --- MODALS & DRAWERS --- */}
      
      {/* 1. TASK DRAWER */}
      {showTaskDrawer && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex justify-end animate-in fade-in duration-200" onClick={() => setShowTaskDrawer(false)}>
              <div 
                  className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-slate-800"
                  onClick={e => e.stopPropagation()}
              >
                  <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                      <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                          {editingTask ? <PenTool size={20} className="text-blue-500"/> : <Plus size={20} className="text-emerald-500"/>}
                          {editingTask ? 'Chỉnh sửa Task' : 'Thêm Công việc'}
                      </h3>
                      <button onClick={() => setShowTaskDrawer(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  
                  {!editingTask && (
                      <div className="flex border-b border-gray-100 dark:border-slate-800">
                          <button 
                            onClick={() => setTaskMode('single')} 
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${taskMode === 'single' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500'}`}
                          >
                              Thêm một
                          </button>
                          <button 
                            onClick={() => setTaskMode('bulk')} 
                            className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${taskMode === 'bulk' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500'}`}
                          >
                              Thêm danh sách
                          </button>
                      </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {taskMode === 'single' ? (
                          <>
                            <div>
                                <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Tiêu đề</label>
                                <input 
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    onKeyDown={handleTaskKeyDown}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white"
                                    placeholder="Nhập tên công việc..."
                                    autoFocus
                                />
                                {!editingTask && (
                                     <p className="text-xs text-gray-400 mt-2">
                                         Ví dụ: "Học bài-1202-3" (Công việc: Học bài, Ngày: 12/02, Ưu tiên: Cao)
                                     </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Hạn chót</label>
                                    <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white"/>
                                </div>
                                <div>
                                     <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Độ ưu tiên</label>
                                     <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white">
                                         <option value="Low">Thấp</option>
                                         <option value="Medium">Trung bình</option>
                                         <option value="High">Cao</option>
                                     </select>
                                </div>
                            </div>
                          </>
                      ) : (
                          <div className="h-full flex flex-col">
                              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">Nhập danh sách công việc, mỗi dòng một việc (Enter để xuống dòng).</p>
                              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 mb-3">
                                  <strong>Cú pháp nhanh:</strong> Tên công việc[-DDMM][-Mức độ]<br/>
                                  - Mức độ: 1=Thấp, 2=Trung bình, 3=Cao<br/>
                                  - Mặc định: Hôm nay, Ưu tiên Thấp<br/>
                                  <em>Ví dụ:</em><br/>
                                  Học Toán<br/>
                                  Làm bài tập-1502-3
                              </div>
                              <textarea
                                value={bulkTaskContent}
                                onChange={(e) => setBulkTaskContent(e.target.value)}
                                className="flex-1 w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white resize-none font-mono text-sm"
                                placeholder={`Học bài\nXem phim-2010-3\nChạy bộ-1`}
                              />
                          </div>
                      )}
                  </div>

                  <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
                      <button onClick={() => setShowTaskDrawer(false)} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 font-medium">{t.cancel}</button>
                      <button onClick={handleSaveTask} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">{t.save}</button>
                  </div>
              </div>
          </div>
      )}

      {/* 2. RESOURCE SIDEBAR (Drawer) */}
      {showResourceDrawer && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex justify-end animate-in fade-in duration-200" onClick={() => setShowResourceDrawer(false)}>
              <div 
                  className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-slate-800"
                  onClick={e => e.stopPropagation()}
              >
                  <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                      <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><LinkIcon size={20} className="text-blue-500"/> {t.addResource}</h3>
                      <button onClick={() => setShowResourceDrawer(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                          {(['Link', 'File'] as const).map(type => (
                              <button key={type} onClick={() => setResType(type)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${resType === type ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-gray-500'}`}>{type}</button>
                          ))}
                      </div>
                      
                      {resType === 'File' ? (
                          <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition relative">
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handleResourceFileSelect(e.target.files[0])}/>
                              <UploadCloud size={40} className="text-emerald-500 mb-2"/>
                              <p className="font-medium text-gray-700 dark:text-gray-300">Chọn file từ máy tính</p>
                              {resUrl && <p className="mt-4 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">Đã chọn: {resTitle}</p>}
                          </div>
                      ) : (
                          <div>
                              <label className="block text-sm font-semibold mb-2 dark:text-gray-300">URL Liên kết</label>
                              <input value={resUrl} onChange={handleUrlChange} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white" placeholder="https://..." autoFocus/>
                          </div>
                      )}
                      <div>
                          <label className="block text-sm font-semibold mb-2 dark:text-gray-300">Tên tài liệu</label>
                          <input value={resTitle} onChange={(e) => setResTitle(e.target.value)} className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-950 dark:text-white" placeholder="Nhập tên hiển thị..."/>
                      </div>
                  </div>
                  
                  <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
                      <button onClick={() => setShowResourceDrawer(false)} className="px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 font-medium">{t.cancel}</button>
                      <button onClick={handleSaveResource} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none">{t.save}</button>
                  </div>
              </div>
          </div>
      )}

      {/* 3. NOTE MODAL */}
      {showNoteModal && (
          <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950 sticky top-0 z-50">
                   <div className="flex items-center gap-3 flex-1">
                       <div className={`p-2 rounded-lg text-white shadow-sm flex-shrink-0 ${subject.color.startsWith('#') ? '' : subject.color}`} style={subject.color.startsWith('#') ? {backgroundColor: subject.color} : {}}>
                           <IconComp size={20}/>
                       </div>
                       <div className="flex flex-col flex-1 max-w-lg">
                           <input value={noteTitle} onChange={(e) => { setNoteTitle(e.target.value); setIsNoteDirty(true); }} placeholder="Tiêu đề (Tự động nếu để trống)" className="text-lg font-bold bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 w-full"/>
                           <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-2">
                               <span>{subject.name}</span>
                               <span>•</span>
                               <span>{saveSuccess ? 'Đã lưu' : (isNoteDirty ? 'Chưa lưu' : 'Ghi chú mới')}</span>
                           </div>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-2">
                        <button onClick={() => toggleSidebar('attachment')} className={`p-2.5 rounded-xl transition flex items-center gap-2 ${activeSidebar === 'attachment' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`} title="Đính kèm">
                            <Paperclip size={20} />
                        </button>

                       <button onClick={() => toggleSidebar('audio')} className={`p-2.5 rounded-xl transition flex items-center gap-2 ${activeSidebar === 'audio' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`} title="Ghi âm">
                           {isRecording ? <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> : <Mic size={20} />}
                       </button>

                       <button onClick={() => toggleSidebar('ai')} className={`p-2.5 rounded-xl transition flex items-center gap-2 ${activeSidebar === 'ai' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`} title="AI Summarize">
                           <Sparkles size={20} />
                       </button>

                        <button onClick={() => toggleSidebar('pdf_export')} className={`p-2.5 rounded-xl transition flex items-center gap-2 ${activeSidebar === 'pdf_export' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-700'}`} title="Xuất PDF">
                           <Printer size={20} />
                       </button>

                       <button onClick={handleSaveNote} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none ml-2">
                           <Save size={18}/> {t.save}
                       </button>

                        <button onClick={handleCloseNoteModal} className="p-2.5 rounded-xl transition flex items-center gap-2 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 ml-2">
                           <X size={20} />
                        </button>
                   </div>
              </div>

              <div className="flex-1 flex overflow-hidden relative">
                  <div className="flex-1 overflow-hidden flex flex-col p-4 bg-white dark:bg-slate-900">
                      <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col">
                          <RichTextEditor ref={editorRef} initialContent={noteContent} onChange={() => setIsNoteDirty(true)} placeholder="Bắt đầu viết ghi chú..." onSave={handleSaveNote}/>
                      </div>
                  </div>

                  {/* Attachment Sidebar */}
                  {activeSidebar === 'attachment' && (
                    <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><LinkIcon size={18} className="text-blue-500"/> Đính kèm</h3>
                            <button onClick={() => setActiveSidebar('none')}><X size={20} className="text-gray-400"/></button>
                        </div>

                        {/* ADD LINK FORM */}
                        <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-900/10">
                            {showAddLinkInput ? (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Tiêu đề link..." className="w-full p-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg outline-none"/>
                                    <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="w-full p-2 text-sm border border-gray-300 dark:border-slate-700 rounded-lg outline-none"/>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddLinkFromSidebar} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700">Thêm</button>
                                        <button onClick={() => setShowAddLinkInput(false)} className="px-3 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-xs font-bold">Hủy</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setShowAddLinkInput(true)} className="w-full py-2 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex items-center justify-center gap-2">
                                    <Plus size={16}/> Thêm Link
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {audioAttachments.length === 0 && extractedImages.length === 0 && extractedLinks.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <FilePlus size={40} className="mx-auto mb-3 opacity-30"/>
                                    <p className="text-sm">Chưa có tệp đính kèm nào.</p>
                                </div>
                            ) : (
                                <>
                                    {extractedLinks.map((link, idx) => (
                                        <div key={`link-${idx}`} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-blue-500 transition-colors bg-white dark:bg-slate-800 shadow-sm group">
                                             <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 flex-shrink-0"><LinkIcon size={14}/></div>
                                            <div className="flex-1 min-w-0">
                                                <a href={link.href} target="_blank" rel="noreferrer" className="font-bold text-gray-800 dark:text-white text-xs truncate hover:underline block" title={link.href}>{link.text}</a>
                                                <p className="text-[10px] text-gray-400 truncate">{link.href}</p>
                                            </div>
                                            <button onClick={() => deleteLinkAttachment(link.href)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    {extractedImages.map((imgSrc, idx) => (
                                        <div key={`img-${idx}`} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-orange-500 transition-colors bg-white dark:bg-slate-800 shadow-sm group">
                                            <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 dark:text-orange-400 flex-shrink-0"><ImageIcon size={14}/></div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 dark:text-white text-xs truncate">Hình ảnh {idx + 1}</h4>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400">Trong nội dung</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={imgSrc} download={`image-${idx}.png`} className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"><Download size={16} /></a>
                                                <button onClick={() => deleteImageAttachment(imgSrc)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {audioAttachments.map(audio => (
                                        <div key={audio.id} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-emerald-500 transition-colors bg-white dark:bg-slate-800 shadow-sm group">
                                            <button onClick={() => { const a = new Audio(audio.url); a.play(); }} className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex-shrink-0"><Play size={14} fill="currentColor"/></button>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 dark:text-white text-xs truncate">{audio.name}</h4>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400">{new Date(audio.createdAt).toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => deleteAudioAttachment(audio.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                  )}

                  {/* Audio Sidebar */}
                  {activeSidebar === 'audio' && (
                      <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
                          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                              <h3 className="font-bold dark:text-white flex items-center gap-2"><Mic size={18} className="text-emerald-500"/> Ghi âm</h3>
                              <button onClick={() => setActiveSidebar('none')}><X size={18} className="text-gray-400"/></button>
                          </div>
                          
                          <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative mb-4">
                                  {isRecording && <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20"></div>}
                                  <button onClick={isRecording ? stopRecording : startRecording} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-lg ${isRecording ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                      {isRecording ? <Square fill="currentColor" size={24}/> : <Mic size={32}/>}
                                  </button>
                              </div>
                              <div className="text-2xl font-mono font-bold text-gray-700 dark:text-gray-200 mb-2">{formatTime(recordingTime)}</div>
                              {isRecording && <div className="w-full h-12 bg-gray-900 rounded-lg overflow-hidden border border-gray-800 relative"><AudioVisualizer stream={recordingStream} isRecording={isRecording} /></div>}
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                              {audioAttachments.map(audio => (
                                  <div key={audio.id} className={`p-3 rounded-xl border transition group ${activeAudioId === audio.id ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
                                      <div className="flex justify-between items-start mb-2">
                                          <div><h4 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-1">{audio.name}</h4><p className="text-[10px] text-gray-400">{new Date(audio.createdAt).toLocaleString()}</p></div>
                                          <button onClick={() => deleteAudioAttachment(audio.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                      </div>
                                      <audio src={audio.url} controls className="w-full h-8 mt-1" onPlay={() => setActiveAudioId(audio.id)}/>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* AI Sidebar */}
                  {activeSidebar === 'ai' && (
                    <div className="w-80 bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
                         <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                              <h3 className="font-bold dark:text-white flex items-center gap-2"><Sparkles size={18} className="text-purple-500"/> AI Support</h3>
                              <button onClick={() => setActiveSidebar('none')}><X size={18} className="text-gray-400"/></button>
                          </div>
                          <div className="flex-1 p-5 overflow-y-auto space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block">1. Lấy Prompt</label>
                                    <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300 italic mb-3 line-clamp-3">"{generatePrompt()}"</div>
                                    <button onClick={handleCopyPrompt} className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200"><Copy size={16}/> Copy</button>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block">2. Hỏi AI</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className="py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center gap-1 text-sm font-bold"><ExternalLink size={14}/> Gemini</a>
                                        <a href="https://chat.openai.com/" target="_blank" rel="noreferrer" className="py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center gap-1 text-sm font-bold"><ExternalLink size={14}/> ChatGPT</a>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block">3. Kết quả</label>
                                    <textarea value={aiSummaryResult} onChange={(e) => setAiSummaryResult(e.target.value)} placeholder="Dán kết quả..." className="w-full h-40 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"/>
                                </div>
                                <button onClick={handleApplySummary} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700">Áp dụng vào Note</button>
                          </div>
                    </div>
                  )}

                   {/* PDF Export Sidebar */}
                   {activeSidebar === 'pdf_export' && (
                    <div className="w-[400px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
                         <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                              <h3 className="font-bold dark:text-white flex items-center gap-2"><Printer size={18} className="text-orange-500"/> Xuất PDF Ghi chú</h3>
                              <button onClick={() => setActiveSidebar('none')}><X size={18} className="text-gray-400"/></button>
                          </div>
                          <div className="flex-1 p-5 overflow-y-auto flex flex-col">
                                <div className="mb-6">
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-3 block flex items-center gap-2"><Settings size={14}/> Tùy chọn</label>
                                    <div className="space-y-3">
                                        <div 
                                            onClick={() => setSinglePdfOpts(p => ({...p, header: !p.header}))}
                                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${singlePdfOpts.header ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-slate-700'}`}
                                        >
                                            <div className={`${singlePdfOpts.header ? 'text-orange-600' : 'text-gray-300'}`}>
                                                {singlePdfOpts.header ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-white">Tiêu đề & Môn học</p>
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => setSinglePdfOpts(p => ({...p, audio: !p.audio}))}
                                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${singlePdfOpts.audio ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-slate-700'}`}
                                        >
                                            <div className={`${singlePdfOpts.audio ? 'text-orange-600' : 'text-gray-300'}`}>
                                                {singlePdfOpts.audio ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-white">Hiển thị File Ghi âm</p>
                                                <p className="text-xs text-gray-400">Liệt kê cuối trang</p>
                                            </div>
                                        </div>

                                        <div 
                                            onClick={() => setSinglePdfOpts(p => ({...p, sources: !p.sources}))}
                                            className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${singlePdfOpts.sources ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-slate-700'}`}
                                        >
                                            <div className={`${singlePdfOpts.sources ? 'text-orange-600' : 'text-gray-300'}`}>
                                                {singlePdfOpts.sources ? <CheckSquare size={20}/> : <Square size={20}/>}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 dark:text-white">Nguồn đính kèm (Link)</p>
                                                <p className="text-xs text-gray-400">Liệt kê Link cuối trang</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex justify-between items-center mb-2">
                                         <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase flex items-center gap-2"><Eye size={14}/> Xem trước</label>
                                         <span className="text-[10px] text-gray-400">Bản xem trước A4 (Tỷ lệ 1:1)</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-950 rounded-xl p-4 border border-gray-200 dark:border-slate-800">
                                        <div 
                                            id="single-note-print-preview"
                                            className="bg-white text-black p-8 shadow-sm mx-auto origin-top transform scale-75 md:scale-90"
                                            style={{ minHeight: '297mm', width: '210mm' }} // A4 dimensions
                                        >
                                            {singlePdfOpts.header && (
                                                <div className="border-b-2 border-gray-800 pb-4 mb-6">
                                                    <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">{subject.name}</h1>
                                                    <p className="text-gray-500 text-sm">Notes Export • {new Date().toLocaleDateString()}</p>
                                                </div>
                                            )}
                                            
                                            <h2 className="text-xl font-bold mb-4">{noteTitle || 'Untitled Note'}</h2>
                                            
                                            <div 
                                                className="prose max-w-none text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: processContentForPrint(noteContent) 
                                                }}
                                            />
                                            
                                            {/* Footer Section for Single Note Export */}
                                            {((singlePdfOpts.audio && audioAttachments.length > 0) || (singlePdfOpts.sources && extractedLinks.length > 0)) && (
                                                <div className="mt-12 pt-4 border-t-2 border-dashed border-gray-300">
                                                    <h4 className="text-sm font-bold uppercase text-gray-500 mb-3">Tài liệu đính kèm & Liên kết</h4>
                                                    
                                                    {singlePdfOpts.audio && audioAttachments.length > 0 && (
                                                        <div className="mb-4">
                                                            <h5 className="font-bold text-xs text-gray-700 uppercase mb-1">File ghi âm:</h5>
                                                            <ul className="list-disc pl-5 text-xs text-gray-600">
                                                                {audioAttachments.map(a => (
                                                                    <li key={a.id}>{a.name} (Ngày: {new Date(a.createdAt).toLocaleDateString()})</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {singlePdfOpts.sources && extractedLinks.length > 0 && (
                                                        <div className="mb-4">
                                                            <h5 className="font-bold text-xs text-gray-700 uppercase mb-1">Liên kết trong bài:</h5>
                                                            <ul className="list-decimal pl-5 text-xs text-gray-600 break-all">
                                                                {extractedLinks.map((l, i) => (
                                                                    <li key={i} className="mb-1">
                                                                        <span className="font-medium text-black">{l.text}</span>: <span className="text-blue-600 underline">{l.href}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                                    <button 
                                        onClick={handleExportSingleNotePDF}
                                        disabled={isExporting}
                                        className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-200 dark:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {isExporting ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                                        {isExporting ? 'Đang tạo PDF...' : 'Tải xuống PDF'}
                                    </button>
                                     <a 
                                        href="https://www.ilovepdf.com/compress_pdf" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-sm"
                                    >
                                        <ExternalLink size={16}/> Tải và nén (I Love PDF)
                                    </a>
                                </div>
                          </div>
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* PDF Drawer (Same as before) */}
      {showPdfDrawer && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex justify-end animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 w-full max-w-sm h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><Printer size={22} className="text-emerald-500"/> Xuất PDF</h3>
                      <button onClick={() => setShowPdfDrawer(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">ƯỚC TÍNH</p>
                              <p className="text-2xl font-bold text-emerald-800 dark:text-white">{estimatedPages} <span className="text-sm font-normal text-emerald-600">Trang</span></p>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">DUNG LƯỢNG</p>
                              <p className="text-2xl font-bold text-emerald-800 dark:text-white">~{estimatedSize} <span className="text-sm font-normal text-emerald-600">MB</span></p>
                          </div>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                           <h4 className="font-bold text-gray-700 dark:text-gray-200">Chọn Ghi chú</h4>
                           <button onClick={() => setSelectedPdfNotes(selectedPdfNotes.length === notes.length ? [] : notes.map(n=>n.id))} className="text-xs font-bold text-emerald-600 hover:underline">
                               {selectedPdfNotes.length === notes.length ? 'Bỏ chọn' : 'Tất cả'}
                           </button>
                      </div>
                      <div className="space-y-2">
                          {notes.map(note => (
                              <div key={note.id} onClick={() => togglePdfNote(note.id)} className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${selectedPdfNotes.includes(note.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-800'}`}>
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${selectedPdfNotes.includes(note.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'}`}>{selectedPdfNotes.includes(note.id) && <CheckSquare size={14}/>}</div>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{note.title}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 space-y-3">
                      <button onClick={handleExportPDF} disabled={isExporting || selectedPdfNotes.length === 0} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {isExporting ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                          {isExporting ? 'Đang tạo PDF...' : 'Tải xuống PDF'}
                      </button>
                      <a 
                            href="https://www.ilovepdf.com/compress_pdf" 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition border border-gray-200 dark:border-slate-700 flex items-center justify-center gap-2 text-sm"
                        >
                            <ExternalLink size={16}/> Tải và nén (I Love PDF)
                        </a>
                  </div>
              </div>
          </div>
      )}

      {/* Resource Preview View */}
      {previewResource && (
          <div className="fixed inset-0 z-[200] flex justify-end animate-in fade-in duration-200 bg-black/50" onClick={() => setPreviewResource(null)}>
              <div className="w-[85%] md:w-[80%] h-full bg-white dark:bg-slate-950 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ml-auto border-l border-gray-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                  <div className="flex-1 flex overflow-hidden">
                      <div className="w-1/4 min-w-[250px] border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex flex-col">
                          <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                              <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2 mb-3"><FolderOpen size={18} className="text-emerald-500"/> Tài liệu khác</h3>
                              <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={drawerSearchTerm} onChange={(e) => setDrawerSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-emerald-500 transition"/></div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-1">
                              {resources.filter(r => r.title.toLowerCase().includes(drawerSearchTerm.toLowerCase())).map(r => {
                                  let Icon = LinkIcon; 
                                  if(r.type === 'File') Icon = FileText; 
                                  if(r.type === 'Audio') Icon = Mic;
                                  if (isYoutubeUrl(r.url)) Icon = Youtube;

                                  return (
                                      <div key={r.id} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition group cursor-pointer ${previewResource.id === r.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent'}`} onClick={() => setPreviewResource(r)}>
                                          <div className="flex items-center gap-3 min-w-0">
                                              <div className={`flex-shrink-0 p-2 rounded-lg ${previewResource.id === r.id ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400' : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}><Icon size={16}/></div>
                                              <span className={`text-sm font-medium truncate ${previewResource.id === r.id ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-slate-300'}`}>{r.title}</span>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
                          <div className="h-16 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900">
                              <div><h2 className="font-bold text-lg text-gray-800 dark:text-white leading-tight">{previewResource.title}</h2><span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{previewResource.type}</span></div>
                              <div className="flex items-center gap-3">
                                  <a href={previewResource.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm font-bold transition"><ExternalLink size={16}/> Mở tab mới</a>
                                  <button onClick={() => setPreviewResource(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 transition"><X size={24}/></button>
                              </div>
                          </div>
                          <div className="flex-1 bg-gray-100 dark:bg-slate-950/50 p-6 flex items-center justify-center overflow-hidden relative">
                               {previewResource.type === 'Link' ? (
                                    <div className="w-full h-full relative rounded-2xl border border-gray-200 dark:border-slate-800 bg-white overflow-hidden group">
                                         {getYoutubeEmbedUrl(previewResource.url) ? (
                                             <iframe 
                                                src={getYoutubeEmbedUrl(previewResource.url)!} 
                                                className="w-full h-full" 
                                                title="YouTube Video" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                allowFullScreen
                                             />
                                         ) : (
                                            <iframe src={previewResource.url} className="w-full h-full" title="Preview" sandbox="allow-same-origin allow-scripts allow-forms"/>
                                         )}
                                         
                                         {/* Enhanced Link Fallback - Small Button */}
                                         <a href={previewResource.url} target="_blank" rel="noreferrer" 
                                            className="absolute bottom-4 right-4 z-50 bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 shadow-lg px-4 py-2 rounded-full text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-emerald-50 hover:text-emerald-600 transition flex items-center gap-2 backdrop-blur-sm"
                                         >
                                            <ExternalLink size={14}/> Mở trang gốc (nếu lỗi)
                                         </a>
                                    </div>
                                ) : previewResource.type === 'Audio' ? (
                                    <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 text-center">
                                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400"><Music size={40} /></div>
                                        <h3 className="text-xl font-bold mb-6 dark:text-white">Phát ghi âm</h3>
                                        <audio controls src={previewResource.url} className="w-full h-12" autoPlay />
                                    </div>
                                ) : (previewResource.type === 'File' || previewResource.url.endsWith('.pdf')) ? (
                                    // PDF Viewer
                                    <div className="w-full h-full flex flex-col bg-gray-200 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner relative">
                                        {/* PDF Toolbar */}
                                        <div className="h-14 bg-white dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700 flex items-center justify-between px-4 shadow-sm z-10">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"><ChevronLeft size={20}/></button>
                                                <span className="text-sm font-medium dark:text-white">Page {pageNum} / {numPages || '--'}</span>
                                                <button onClick={() => setPageNum(p => Math.min(numPages, p + 1))} disabled={pageNum >= numPages} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"><ChevronRight size={20}/></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Zoom Out"><ZoomOut size={18}/></button>
                                                <span className="text-sm font-mono w-12 text-center dark:text-white">{Math.round(scale * 100)}%</span>
                                                <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" title="Zoom In"><ZoomIn size={18}/></button>
                                            </div>
                                        </div>
                                        {/* Canvas Container */}
                                        <div className="flex-1 overflow-auto flex justify-center p-8 bg-gray-500/10">
                                            <canvas ref={canvasRef} className="shadow-xl" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={previewResource.url} className="max-w-full max-h-full rounded-lg shadow-lg object-contain" alt="Preview"/>
                                    </div>
                                )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Hidden Print Area */}
      {isExporting && printData && (
          <div id="print-area" className="fixed top-0 left-0 w-[210mm] bg-white text-black p-[20mm] z-[-1] pointer-events-none">
              <div className="mb-8 border-b-2 border-slate-800 pb-4">
                  <h1 className="text-3xl font-bold uppercase tracking-wider">{subject.name}</h1>
                  <p className="text-slate-600 mt-2">Tổng hợp ghi chú môn học</p>
              </div>
              <div className="flex flex-col gap-8">
                  {printData.map((note, idx) => {
                      const processedContent = processContentForPrint(note.content);
                      const { audios, links } = extractMetadataFromContent(note.content);
                      
                      return (
                      <div key={idx} className="mb-10 break-inside-avoid border-b pb-6 border-slate-100 printable-note-item">
                          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-l-4 border-slate-800 pl-3">
                              <span className="text-slate-400">#{idx + 1}</span>
                              {note.title}
                          </h2>
                          <div className="prose max-w-none text-justify leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: processedContent }}/>
                          
                          {/* Note Footer: Attachments */}
                          {(audios.length > 0 || links.length > 0) && (
                              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Tài liệu tham khảo & Đính kèm</h4>
                                  
                                  {audios.length > 0 && (
                                      <div className="mb-3">
                                          <p className="text-xs font-bold text-slate-700 mb-1">Ghi âm:</p>
                                          <ul className="list-disc pl-4 text-xs text-slate-600">
                                              {audios.map((a, i) => (
                                                  <li key={i}>{a.name} ({new Date(a.date).toLocaleDateString()})</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}

                                  {links.length > 0 && (
                                      <div>
                                          <p className="text-xs font-bold text-slate-700 mb-1">Liên kết:</p>
                                          <ul className="list-decimal pl-4 text-xs text-slate-600 break-all">
                                              {links.map((l, i) => (
                                                  <li key={i}><span className="font-medium">{l.text}</span>: {l.href}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                              </div>
                          )}
                          <div className="mt-4 text-xs text-slate-400 flex justify-between"><span>Last modified: {new Date(note.lastModified).toLocaleDateString()}</span></div>
                      </div>
                  )})}

                  {/* Subject Tasks Section at the END of bulk export */}
                  {tasks.length > 0 && (
                      <div className="break-before-page mt-8 printable-note-item">
                          <h2 className="text-2xl font-bold uppercase tracking-wider mb-6 border-b-2 border-slate-800 pb-2">Danh sách Công việc (Tasks)</h2>
                          <div className="space-y-2">
                              {tasks.map((task, idx) => (
                                  <div key={idx} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                      <div className={`mt-0.5 w-4 h-4 border-2 rounded flex items-center justify-center ${task.status === 'done' ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400'}`}>
                                          {task.status === 'done' && <CheckCircle size={10} className="text-white"/>}
                                      </div>
                                      <div className="flex-1">
                                          <p className={`text-sm font-bold ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{task.title}</p>
                                          <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                              <span>Hạn: {task.dueDate}</span>
                                              <span>Ưu tiên: {task.priority}</span>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default SubjectDetail;