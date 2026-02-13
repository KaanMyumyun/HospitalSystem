import { UserRole } from "./userRole";

export interface CurrentUser {
  id: string;
  roles: UserRole[];
}