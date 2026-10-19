import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../lib/firebase';

export const createSubUser = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  targetRole: string,
  creatorId: string
) => {
  let secondaryApp: FirebaseApp | undefined;

  try {
    const appName = `SecondaryApp_${Date.now()}`;
    secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;

    await setDoc(doc(db, 'admins', newUser.uid), {
      uid: newUser.uid,
      name: name,
      email: email,
      phone: phone,
      role: targetRole,
      isActive: true,
      createdBy: creatorId,
      createdAt: serverTimestamp()
    });

    await signOut(secondaryAuth);
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error creating sub-user:", errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
  }
};
