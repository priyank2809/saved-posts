export interface Post {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  savesCount: number;
  createdAt: string;
  savedAt?: string;
  hasSaved: boolean;
}

export interface Course {
  id: string;
  name: string;
}

export interface PagedResponse<T> {
  posts: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
