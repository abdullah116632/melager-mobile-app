export interface MemberRequest {
  id: number;
  userId: number;
  name: string;
  email?: string;
  status: string;
  createdAt: string;
}
