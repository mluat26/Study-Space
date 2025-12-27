import { Subject, Task, Note, Resource, Language } from './types';
import { BookOpen, Calculator, Code, FlaskConical, Globe, History, Music, Palette, Atom, Briefcase, Cpu, Database, Dna, Microscope, PenTool, Rocket, Terminal } from 'lucide-react';

export const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
  'bg-rose-500', 'bg-slate-500'
];

export const ICONS: Record<string, any> = {
  Book: BookOpen,
  Calculator: Calculator,
  Code: Code,
  Science: FlaskConical,
  Globe: Globe,
  History: History,
  Art: Palette,
  Music: Music,
  Atom: Atom,
  Briefcase: Briefcase,
  Cpu: Cpu,
  Database: Database,
  Dna: Dna,
  Microscope: Microscope,
  Pen: PenTool,
  Rocket: Rocket,
  Terminal: Terminal
};

export const INITIAL_SUBJECTS: Subject[] = [
  { id: '1', name: 'Toán Cao Cấp', description: 'Giải tích và Đại số tuyến tính', color: 'bg-blue-500', icon: 'Calculator', createdAt: '2023-09-01T08:00:00.000Z' },
  { id: '2', name: 'Lập Trình Web', description: 'React, TypeScript và Node.js', color: 'bg-indigo-500', icon: 'Code', createdAt: '2023-09-02T09:30:00.000Z' },
  { id: '3', name: 'Lịch Sử Đảng', description: 'Lịch sử chính trị Việt Nam', color: 'bg-red-500', icon: 'History', createdAt: '2023-09-03T07:15:00.000Z' },
  { id: '4', name: 'Tiếng Anh', description: 'IELTS Preparation', color: 'bg-sky-500', icon: 'Globe', createdAt: '2023-09-05T14:20:00.000Z' },
];

export const INITIAL_TASKS: Task[] = [
  { id: 't1', subjectId: '1', title: 'Làm bài tập chương 3', status: 'todo', dueDate: '2023-11-20', priority: 'High' },
  { id: 't2', subjectId: '1', title: 'Ôn tập giữa kỳ', status: 'done', dueDate: '2023-11-15', priority: 'High' },
  { id: 't3', subjectId: '2', title: 'Hoàn thành Project Frontend', status: 'doing', dueDate: '2023-11-25', priority: 'Medium' },
  { id: 't4', subjectId: '2', title: 'Đọc tài liệu React Hooks', status: 'done', dueDate: '2023-11-10', priority: 'Low' },
  { id: 't5', subjectId: '4', title: 'Viết bài luận Task 2', status: 'todo', dueDate: '2023-11-22', priority: 'High' },
];

export const INITIAL_NOTES: Note[] = [
  { id: 'n1', subjectId: '2', title: 'Ghi chú về useEffect', content: 'useEffect chạy sau mỗi lần render. Cần chú ý dependency array để tránh infinite loop.', lastModified: '2023-11-12' },
  { id: 'n2', subjectId: '1', title: 'Công thức đạo hàm', content: 'Đạo hàm của sin(x) là cos(x). Đạo hàm của cos(x) là -sin(x).', lastModified: '2023-11-14' },
];

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'r1', subjectId: '2', title: 'React Documentation', type: 'Link', url: 'https://react.dev' },
  { id: 'r2', subjectId: '1', title: 'Giáo trình Giải tích.pdf', type: 'File', url: '#' },
];

export const TRANSLATIONS = {
    vi: {
        dashboard: 'Góc học tập',
        search: 'Tìm kiếm',
        storage: 'Lưu trữ',
        subjects: 'Môn học',
        createSubject: 'Tạo môn',
        searchPlaceholder: 'Tìm môn học...',
        today: 'Hôm nay',
        tasksDue: 'Công việc cần làm',
        progress: 'Tiến độ tổng quan',
        active: 'Đang học',
        archived: 'Đã lưu trữ',
        noSubjects: 'Chưa có môn học nào',
        emptyArchive: 'Thùng lưu trữ trống',
        deleteConfirm: 'Bạn có chắc muốn xóa môn này vĩnh viễn?',
        restore: 'Khôi phục',
        archive: 'Lưu trữ',
        delete: 'Xóa vĩnh viễn',
        tasks: 'Công việc',
        notes: 'Ghi chú',
        resources: 'Tài liệu',
        back: 'Quay lại',
        exportPdf: 'Xuất PDF',
        todo: 'Cần làm',
        doing: 'Đang làm',
        done: 'Đã xong',
        addTask: 'Thêm Task',
        addNote: 'Ghi chú mới',
        addResource: 'Thêm tài liệu',
        cancel: 'Hủy bỏ',
        save: 'Lưu',
        name: 'Tên',
        desc: 'Mô tả',
        cover: 'Ảnh bìa',
        icon: 'Biểu tượng',
        color: 'Màu sắc'
    },
    en: {
        dashboard: 'Dashboard',
        search: 'Search',
        storage: 'Storage',
        subjects: 'Subjects',
        createSubject: 'Add Subject',
        searchPlaceholder: 'Search subjects...',
        today: 'Today',
        tasksDue: 'Tasks Due',
        progress: 'Overview Progress',
        active: 'Active',
        archived: 'Archived',
        noSubjects: 'No subjects found',
        emptyArchive: 'Archive is empty',
        deleteConfirm: 'Are you sure you want to permanently delete this subject?',
        restore: 'Restore',
        archive: 'Archive',
        delete: 'Delete Permanently',
        tasks: 'Tasks',
        notes: 'Notes',
        resources: 'Resources',
        back: 'Back',
        exportPdf: 'Export PDF',
        todo: 'To Do',
        doing: 'In Progress',
        done: 'Done',
        addTask: 'Add Task',
        addNote: 'New Note',
        addResource: 'Add Resource',
        cancel: 'Cancel',
        save: 'Save',
        name: 'Name',
        desc: 'Description',
        cover: 'Cover Image',
        icon: 'Icon',
        color: 'Color'
    }
};