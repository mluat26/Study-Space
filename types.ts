export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt?: string; // ISO String
  isArchived?: boolean;
}

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  status: 'todo' | 'doing' | 'done'; // Changed from boolean completed
  dueDate: string; // ISO date string
  priority: 'High' | 'Medium' | 'Low';
}

export interface Note {
  id: string;
  subjectId: string;
  title: string;
  content: string; // Now contains HTML
  lastModified: string;
}

export interface Resource {
  id: string;
  subjectId: string;
  title: string;
  type: 'Link' | 'File' | 'Audio';
  url: string;
  transcription?: string; // For Audio types
}

export interface TrashItem {
  id: string; // ID of the deleted item
  originalId: string;
  type: 'subject' | 'task' | 'note' | 'resource';
  data: any; // Store the full object to restore
  deletedAt: string;
  originalName: string;
  // For subjects, we might store children to restore them too
  relatedData?: {
      tasks?: Task[];
      notes?: Note[];
      resources?: Resource[];
  };
}

export type Language = 'vi' | 'en';