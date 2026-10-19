import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ParticipantIdentityProps {
  userId: string;
}

export const ParticipantIdentity: React.FC<ParticipantIdentityProps> = ({ userId }) => {
  const [userData, setUserData] = useState<{ name: string; photoUrl: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData({
            name: data.fullName || data.name || data.displayName || 'Unknown User',
            photoUrl: data.photoUrl || data.avatar || data.photo || `https://ui-avatars.com/api/?name=${data.name || 'U'}`,
          });
        }
      } catch (error) {
        console.error('Error fetching participant data:', error);
      }
    };
    
    fetchUser();
  }, [userId]);

  return (
    <div className="flex items-center gap-3">
      {userData?.photoUrl ? (
        <img 
          src={userData.photoUrl} 
          alt={userData.name} 
          className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-800"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
          <span className="text-gray-400 text-xs">...</span>
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
          {userData?.name || 'Loading...'}
        </span>
        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 select-all tracking-tight mt-0.5">
          {userId}
        </span>
      </div>
    </div>
  );
};
