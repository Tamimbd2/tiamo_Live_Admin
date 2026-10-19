import { Timestamp } from "firebase/firestore";

export interface Gift {
  id?: string;
  name: string;
  price: number | string;
  category: string;
  subCategory?: string;
  tier?: "free" | "premium";
  imageURL: string;
  iconURL: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}
