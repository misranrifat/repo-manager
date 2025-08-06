export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  owner: string;
  htmlUrl: string;
  isPrivate: boolean;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  createdAt: string;
  updatedAt: string;
  size: number;
  defaultBranch: string;
}

export type VisibilityFilter = 'all' | 'public' | 'private';