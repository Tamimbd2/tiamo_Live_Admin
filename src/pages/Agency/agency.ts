import { Timestamp } from "firebase/firestore";

export interface Agency {
  id: string;
  name: string;
  email: string;
  logo: string;
  ownerId: string; 
  status: "pending" | "active" | "inactive";
  createdAt?: Timestamp;
}

export interface Member {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "blocked";
  joinedAt?: Timestamp;
}
